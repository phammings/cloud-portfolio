import json
import unittest
from decimal import Decimal
from unittest.mock import patch

from handler import lambda_handler


def call(route_key, body=None, **path):
    event = {"routeKey": route_key, "pathParameters": path, "body": body}
    response = lambda_handler(event, None)
    return response["statusCode"], json.loads(response["body"])


class TestHandler(unittest.TestCase):

    @patch("handler.table")
    def test_content_groups_and_sorts_items(self, mock_table):
        mock_table.query.side_effect = [
            {
                "Items": [
                    {"PK": "SITE", "SK": "PROFILE", "name": "Ryan"},
                    {"PK": "SITE", "SK": "SECRET", "images": ["media/x/a.jpg"]},
                    {"PK": "SITE", "SK": "PROJECT#b", "title": "Second", "order": Decimal(2)},
                ],
                "LastEvaluatedKey": {"PK": "SITE", "SK": "PROJECT#b"},
            },
            {
                "Items": [
                    {"PK": "SITE", "SK": "PROJECT#a", "title": "First", "order": Decimal(1)},
                    {"PK": "SITE", "SK": "EXPERIENCE#x", "company": "Acme"},
                ]
            },
        ]

        status, body = call("GET /content")

        self.assertEqual(status, 200)
        self.assertEqual(body["profile"], {"name": "Ryan"})
        self.assertEqual(body["secret"], {"images": ["media/x/a.jpg"]})
        self.assertEqual([p["id"] for p in body["projects"]], ["a", "b"])
        self.assertEqual(body["experience"], [{"id": "x", "company": "Acme"}])
        self.assertEqual(mock_table.query.call_count, 2)

    @patch("handler.table")
    def test_views_increments_atomically(self, mock_table):
        mock_table.update_item.return_value = {"Attributes": {"views": Decimal(3174)}}

        status, body = call("POST /views")

        self.assertEqual((status, body), (200, {"views": 3174}))
        kwargs = mock_table.update_item.call_args.kwargs
        self.assertEqual(kwargs["Key"], {"PK": "COUNTER", "SK": "VIEWS"})
        self.assertEqual(kwargs["UpdateExpression"], "ADD #views :one")

    def test_unknown_route_is_404(self):
        status, _ = call("GET /nope")
        self.assertEqual(status, 404)

    @patch("handler.table")
    def test_put_project_stores_under_site_and_strips_keys(self, mock_table):
        body = json.dumps({"title": "Airbnb Clone", "order": 2, "rating": 4.5, "PK": "X", "id": "y"})

        status, saved = call("PUT /items/{type}/{id}", body, type="project", id="airbnb-clone")

        self.assertEqual(status, 200)
        self.assertEqual(saved, {"title": "Airbnb Clone", "order": 2, "rating": 4.5})
        item = mock_table.put_item.call_args.kwargs["Item"]
        self.assertEqual((item["PK"], item["SK"]), ("SITE", "PROJECT#airbnb-clone"))
        self.assertIsInstance(item["rating"], Decimal)

    @patch("handler.table")
    def test_profile_is_a_single_item(self, mock_table):
        call("PUT /items/{type}/{id}", '{"name": "Ryan"}', type="profile", id="anything")
        self.assertEqual(mock_table.put_item.call_args.kwargs["Item"]["SK"], "PROFILE")

    @patch("handler.table")
    def test_secret_is_a_single_item(self, mock_table):
        call("PUT /items/{type}/{id}", '{"images": []}', type="secret", id="me")
        self.assertEqual(mock_table.put_item.call_args.kwargs["Item"]["SK"], "SECRET")

    @patch("handler.table")
    def test_delete_experience(self, mock_table):
        status, _ = call("DELETE /items/{type}/{id}", type="experience", id="acme")
        self.assertEqual(status, 200)
        mock_table.delete_item.assert_called_once_with(Key={"PK": "SITE", "SK": "EXPERIENCE#acme"})

    @patch("handler.table")
    def test_bad_requests_are_rejected_without_writing(self, mock_table):
        cases = [
            ("PUT /items/{type}/{id}", "{}", {"type": "user", "id": "a"}),
            ("PUT /items/{type}/{id}", "{}", {"type": "project", "id": "../Bad"}),
            ("PUT /items/{type}/{id}", "not json", {"type": "project", "id": "a"}),
            ("PUT /items/{type}/{id}", "[1]", {"type": "project", "id": "a"}),
            ("PUT /items/{type}/{id}", "x" * 100_001, {"type": "project", "id": "a"}),
        ]
        for route, body, path in cases:
            with self.subTest(path=path, body=body[:20]):
                status, _ = call(route, body, **path)
                self.assertEqual(status, 400)
        mock_table.put_item.assert_not_called()

    @patch("handler.s3")
    def test_upload_returns_presigned_post_with_limits(self, mock_s3):
        mock_s3.generate_presigned_post.return_value = {"url": "https://s3", "fields": {"key": "k"}}

        status, body = call("POST /uploads", json.dumps({"filename": "My Resume.pdf", "contentType": "application/pdf"}))

        self.assertEqual(status, 200)
        self.assertRegex(body["key"], r"^media/[0-9a-f]{32}/My-Resume\.pdf$")
        conditions = mock_s3.generate_presigned_post.call_args.kwargs["Conditions"]
        self.assertIn(["content-length-range", 1, 10 * 1024 * 1024], conditions)

    @patch("handler.s3")
    def test_upload_rejects_other_file_types(self, mock_s3):
        status, _ = call("POST /uploads", json.dumps({"filename": "x.html", "contentType": "text/html"}))
        self.assertEqual(status, 400)
        mock_s3.generate_presigned_post.assert_not_called()

    @patch("handler.cognito")
    def test_login_returns_access_token(self, mock_cognito):
        mock_cognito.initiate_auth.return_value = {
            "AuthenticationResult": {"AccessToken": "jwt", "ExpiresIn": 3600, "IdToken": "id", "RefreshToken": "r"}
        }

        status, body = call("POST /login", json.dumps({"email": "a@b.com", "password": "pw"}))

        self.assertEqual((status, body), (200, {"accessToken": "jwt", "expiresIn": 3600, "tokenType": "Bearer"}))
        kwargs = mock_cognito.initiate_auth.call_args.kwargs
        self.assertEqual(kwargs["AuthFlow"], "USER_PASSWORD_AUTH")
        self.assertEqual(kwargs["AuthParameters"], {"USERNAME": "a@b.com", "PASSWORD": "pw"})

    @patch("handler.cognito")
    def test_login_failures_map_to_status_codes(self, mock_cognito):
        class NotAuthorized(Exception): pass
        class UserNotFound(Exception): pass
        class TooMany(Exception): pass
        mock_cognito.exceptions.NotAuthorizedException = NotAuthorized
        mock_cognito.exceptions.UserNotFoundException = UserNotFound
        mock_cognito.exceptions.TooManyRequestsException = TooMany
        good_body = json.dumps({"email": "a@b.com", "password": "pw"})

        for error, expected in [(NotAuthorized, 401), (UserNotFound, 401), (TooMany, 429)]:
            with self.subTest(error=error.__name__):
                mock_cognito.initiate_auth.side_effect = error()
                status, body = call("POST /login", good_body)
                self.assertEqual(status, expected)
        mock_cognito.initiate_auth.side_effect = None
        mock_cognito.initiate_auth.return_value = {"ChallengeName": "NEW_PASSWORD_REQUIRED"}
        self.assertEqual(call("POST /login", good_body)[0], 403)
        self.assertEqual(call("POST /login", json.dumps({"email": "a@b.com"}))[0], 400)


if __name__ == "__main__":
    unittest.main()
