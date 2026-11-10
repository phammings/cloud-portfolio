"""clients/: S3 presign conditions and Cognito error translation."""
import unittest
from unittest.mock import patch

from clients import cognito_client, s3_client
from models.errors import TooManyRequests, Unauthorized


class TestS3Client(unittest.TestCase):

    @patch("clients.s3_client.s3")
    def test_presign_post_enforces_type_and_size(self, s3):
        s3.generate_presigned_post.return_value = {"url": "https://s3", "fields": {"key": "k"}, "extra": 1}

        self.assertEqual(s3_client.presign_post("media/a/x.pdf", "application/pdf", 100, 300), {"url": "https://s3", "fields": {"key": "k"}})
        kwargs = s3.generate_presigned_post.call_args.kwargs
        self.assertIn(["content-length-range", 1, 100], kwargs["Conditions"])
        self.assertIn({"Content-Type": "application/pdf"}, kwargs["Conditions"])
        self.assertEqual(kwargs["ExpiresIn"], 300)


class TestCognitoClient(unittest.TestCase):

    @patch("clients.cognito_client.cognito")
    def test_password_auth_request(self, cognito):
        cognito.initiate_auth.return_value = {"AuthenticationResult": {}}

        cognito_client.password_auth("a@b.com", "pw")

        kwargs = cognito.initiate_auth.call_args.kwargs
        self.assertEqual(kwargs["AuthFlow"], "USER_PASSWORD_AUTH")
        self.assertEqual(kwargs["AuthParameters"], {"USERNAME": "a@b.com", "PASSWORD": "pw"})

    @patch("clients.cognito_client.cognito")
    def test_cognito_errors_become_domain_errors(self, cognito):
        class NotAuthorized(Exception): pass
        class UserNotFound(Exception): pass
        class TooMany(Exception): pass
        cognito.exceptions.NotAuthorizedException = NotAuthorized
        cognito.exceptions.UserNotFoundException = UserNotFound
        cognito.exceptions.TooManyRequestsException = TooMany

        for raised, expected in [(NotAuthorized, Unauthorized), (UserNotFound, Unauthorized), (TooMany, TooManyRequests)]:
            with self.subTest(raised=raised.__name__):
                cognito.initiate_auth.side_effect = raised()
                with self.assertRaises(expected) as caught:
                    cognito_client.password_auth("a@b.com", "pw")
                if expected is Unauthorized:
                    # unknown email and wrong password must be indistinguishable
                    self.assertEqual(str(caught.exception), "Incorrect email or password")


if __name__ == "__main__":
    unittest.main()
