import base64
import json
import os
import re
import uuid
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ.get("TABLE_NAME", "portfolio"))
s3 = boto3.client("s3")
cognito = boto3.client("cognito-idp")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")

# SK prefix -> key in the /content response
COLLECTIONS = {"PROJECT#": "projects", "EXPERIENCE#": "experience"}
# {type} path param -> SK prefix. Profile is a single item, so its {id} is ignored.
ITEM_TYPES = {"project": "PROJECT#", "experience": "EXPERIENCE#"}
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_BODY_BYTES = 100_000
UPLOAD_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class HttpError(Exception):
    status = 500


class BadRequest(HttpError):
    status = 400


class Unauthorized(HttpError):
    status = 401


class Forbidden(HttpError):
    status = 403


class TooManyRequests(HttpError):
    status = 429


def _json_default(value):
    # DynamoDB returns numbers as Decimal
    return int(value) if value % 1 == 0 else float(value)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body, default=_json_default),
    }


def get_content():
    items, kwargs = [], {"KeyConditionExpression": Key("PK").eq("SITE")}
    while True:
        page = table.query(**kwargs)
        items += page["Items"]
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    content = {"profile": None, "projects": [], "experience": []}
    for item in items:
        sk = item.pop("SK")
        item.pop("PK")
        if sk == "PROFILE":
            content["profile"] = item
            continue
        for prefix, name in COLLECTIONS.items():
            if sk.startswith(prefix):
                content[name].append({"id": sk[len(prefix):], **item})
    for name in COLLECTIONS.values():
        content[name].sort(key=lambda i: i.get("order", 0))
    return content


def increment_views():
    result = table.update_item(
        Key={"PK": "COUNTER", "SK": "VIEWS"},
        UpdateExpression="ADD #views :one",
        ExpressionAttributeNames={"#views": "views"},
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    return {"views": result["Attributes"]["views"]}


def _sort_key(event):
    params = event.get("pathParameters") or {}
    item_type, item_id = params.get("type"), params.get("id", "")
    if item_type == "profile":
        return "PROFILE"
    if item_type not in ITEM_TYPES:
        raise BadRequest(f"type must be one of: profile, {', '.join(ITEM_TYPES)}")
    if not ID_PATTERN.match(item_id):
        raise BadRequest("id must be lowercase letters, digits and dashes (max 64)")
    return ITEM_TYPES[item_type] + item_id


def _json_body(event):
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode()
    if len(body) > MAX_BODY_BYTES:
        raise BadRequest("body too large")
    try:
        # DynamoDB rejects floats, so parse them as Decimal
        data = json.loads(body, parse_float=Decimal)
    except ValueError:
        raise BadRequest("body must be JSON")
    if not isinstance(data, dict):
        raise BadRequest("body must be a JSON object")
    return data


def put_item(event):
    sk = _sort_key(event)
    data = _json_body(event)
    for reserved in ("PK", "SK", "id"):
        data.pop(reserved, None)
    table.put_item(Item={"PK": "SITE", "SK": sk, **data})
    return data


def delete_item(event):
    table.delete_item(Key={"PK": "SITE", "SK": _sort_key(event)})
    return {"deleted": True}


def create_upload(event):
    data = _json_body(event)
    content_type = data.get("contentType")
    if content_type not in UPLOAD_TYPES:
        raise BadRequest(f"contentType must be one of: {', '.join(sorted(UPLOAD_TYPES))}")
    name = re.sub(r"[^a-zA-Z0-9._-]", "-", str(data.get("filename") or "file"))[-100:]
    key = f"media/{uuid.uuid4().hex}/{name}"
    # A presigned POST (not PUT) so S3 itself enforces the type and size limits
    post = s3.generate_presigned_post(
        Bucket=MEDIA_BUCKET,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[{"Content-Type": content_type}, ["content-length-range", 1, MAX_UPLOAD_BYTES]],
        ExpiresIn=300,
    )
    return {"key": key, "url": post["url"], "fields": post["fields"]}


def login(event):
    data = _json_body(event)
    email, password = data.get("email"), data.get("password")
    if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
        raise BadRequest("email and password are required")
    try:
        result = cognito.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )
    except (cognito.exceptions.NotAuthorizedException, cognito.exceptions.UserNotFoundException):
        # Same answer for unknown email and wrong password
        raise Unauthorized("Incorrect email or password")
    except cognito.exceptions.TooManyRequestsException:
        raise TooManyRequests("Too many attempts, try again later")
    if "AuthenticationResult" not in result:
        raise Forbidden(f"Login needs another step ({result.get('ChallengeName')}); set your password on the hosted login page first")
    tokens = result["AuthenticationResult"]
    return {"accessToken": tokens["AccessToken"], "expiresIn": tokens["ExpiresIn"], "tokenType": "Bearer"}


ROUTES = {
    "GET /content": lambda event: get_content(),
    "POST /views": lambda event: increment_views(),
    "POST /login": login,
    "PUT /items/{type}/{id}": put_item,
    "DELETE /items/{type}/{id}": delete_item,
    "POST /uploads": create_upload,
}


def lambda_handler(event, context):
    route = ROUTES.get(event.get("routeKey"))
    if route is None:
        return _response(404, {"message": "Not found"})
    try:
        return _response(200, route(event))
    except HttpError as error:
        return _response(error.status, {"message": str(error)})
