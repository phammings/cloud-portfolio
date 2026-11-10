"""Lambda entry point for the API Gateway HTTP API (payload format 2.0).

Parses the event into a Request, dispatches it through routes.ROUTES, and turns the result (or a domain
error from models.errors) into an HTTP response. Business logic lives in services/, data access in
repositories/ (DynamoDB) and clients/ (S3, Cognito).
"""
import base64
import json
from decimal import Decimal
from functools import cached_property

from models.errors import ApiError, BadRequest
from routes import ROUTES

MAX_BODY_BYTES = 100_000


class Request:
    def __init__(self, event: dict):
        self._event = event

    def path(self, name: str) -> str | None:
        return (self._event.get("pathParameters") or {}).get(name)

    @cached_property
    def _body(self) -> dict:
        body = self._event.get("body") or ""
        if self._event.get("isBase64Encoded"):
            body = base64.b64decode(body).decode()
        if len(body) > MAX_BODY_BYTES:
            raise BadRequest("body too large")
        try:
            # DynamoDB rejects floats, so decimals are parsed as Decimal
            data = json.loads(body, parse_float=Decimal)
        except ValueError:
            raise BadRequest("body must be JSON")
        if not isinstance(data, dict):
            raise BadRequest("body must be a JSON object")
        return data

    def json(self) -> dict:
        """The JSON object body, parsed once; raises BadRequest if it's missing, too large or not an object."""
        return self._body


def _json_default(value):
    # DynamoDB returns numbers as Decimal
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"{type(value).__name__} is not JSON serializable")


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body, default=_json_default),
    }


def lambda_handler(event, context):
    route = ROUTES.get(event.get("routeKey"))
    if route is None:
        return _response(404, {"message": "Not found"})
    try:
        return _response(200, route(Request(event)))
    except ApiError as error:
        return _response(error.status, {"message": str(error)})
