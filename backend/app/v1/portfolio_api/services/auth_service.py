"""Admin login: exchanges email + password for a Cognito access token."""
from clients import cognito_client
from models.errors import BadRequest, Forbidden


def login(email, password) -> dict:
    if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
        raise BadRequest("email and password are required")
    result = cognito_client.password_auth(email, password)
    if "AuthenticationResult" not in result:
        # e.g. NEW_PASSWORD_REQUIRED for the emailed temporary password
        raise Forbidden(f"Login needs another step ({result.get('ChallengeName')}); set your password on the hosted login page first")
    tokens = result["AuthenticationResult"]
    return {"accessToken": tokens["AccessToken"], "expiresIn": tokens["ExpiresIn"], "tokenType": "Bearer"}
