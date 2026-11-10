"""Domain errors. Services raise these; app.py turns each into an HTTP response with its status."""


class ApiError(Exception):
    status = 500


class BadRequest(ApiError):
    status = 400


class Unauthorized(ApiError):
    status = 401


class Forbidden(ApiError):
    status = 403


class NotFound(ApiError):
    status = 404


class TooManyRequests(ApiError):
    status = 429
