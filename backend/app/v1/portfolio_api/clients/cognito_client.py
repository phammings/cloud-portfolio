"""Cognito access: password login for the admin user pool."""
import boto3

import config
from models.errors import TooManyRequests, Unauthorized

cognito = boto3.client("cognito-idp")


def password_auth(email: str, password: str) -> dict:
    """Cognito InitiateAuth with USER_PASSWORD_AUTH; returns Cognito's raw response.

    Cognito's exceptions become domain errors here, so services never handle boto types.
    """
    try:
        return cognito.initiate_auth(
            ClientId=config.COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )
    except (cognito.exceptions.NotAuthorizedException, cognito.exceptions.UserNotFoundException):
        # Same answer for an unknown email and a wrong password, so accounts can't be probed
        raise Unauthorized("Incorrect email or password")
    except cognito.exceptions.TooManyRequestsException:
        raise TooManyRequests("Too many attempts, try again later")
