import json
import os

import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ.get("TABLE_NAME", "portfolio"))

# SK prefix -> key in the /content response
COLLECTIONS = {"PROJECT#": "projects", "EXPERIENCE#": "experience"}


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


ROUTES = {
    "GET /content": get_content,
    "POST /views": increment_views,
}


def lambda_handler(event, context):
    route = ROUTES.get(event.get("routeKey"))
    if route is None:
        return _response(404, {"message": "Not found"})
    return _response(200, route())
