"""services/: business logic, with repositories and clients mocked out."""
import unittest
from decimal import Decimal
from unittest.mock import patch

from models.errors import BadRequest, Forbidden
from services import auth_service, content_service, items_service, upload_service, views_service


class TestContentService(unittest.TestCase):

    @patch("repositories.content_repository.list_site_items")
    def test_groups_and_sorts_items(self, list_site_items):
        list_site_items.return_value = [
            {"PK": "SITE", "SK": "PROFILE", "name": "Ryan"},
            {"PK": "SITE", "SK": "SECRET", "images": ["media/x/a.jpg"]},
            {"PK": "SITE", "SK": "PROJECT#b", "title": "Second", "order": Decimal(2)},
            {"PK": "SITE", "SK": "PROJECT#a", "title": "First", "order": Decimal(1)},
            {"PK": "SITE", "SK": "EXPERIENCE#x", "company": "Acme"},
            {"PK": "SITE", "SK": "FUTURE#thing", "ignored": True},
        ]

        content = content_service.get_content()

        self.assertEqual(content["profile"], {"name": "Ryan"})
        self.assertEqual(content["secret"], {"images": ["media/x/a.jpg"]})
        self.assertEqual([p["id"] for p in content["projects"]], ["a", "b"])
        self.assertEqual(content["experience"], [{"id": "x", "company": "Acme"}])

    @patch("repositories.content_repository.list_site_items", return_value=[])
    def test_empty_site(self, _list):
        self.assertEqual(content_service.get_content(), {"profile": None, "secret": None, "projects": [], "experience": []})


class TestViewsService(unittest.TestCase):

    @patch("repositories.counter_repository.increment", return_value=3190)
    def test_counts_a_view(self, increment):
        self.assertEqual(views_service.count_view(), {"views": 3190})
        increment.assert_called_once_with("VIEWS", "views")


class TestItemsService(unittest.TestCase):

    @patch("repositories.content_repository.put_site_item")
    def test_save_strips_key_fields(self, put_site_item):
        saved = items_service.save_item("project", "airbnb-clone", {"title": "Airbnb", "rating": Decimal("4.5"), "PK": "X", "id": "y"})

        self.assertEqual(saved, {"title": "Airbnb", "rating": Decimal("4.5")})
        put_site_item.assert_called_once_with("PROJECT#airbnb-clone", {"title": "Airbnb", "rating": Decimal("4.5")})

    @patch("repositories.content_repository.put_site_item")
    def test_save_rejects_invalid_ids_without_writing(self, put_site_item):
        with self.assertRaises(BadRequest):
            items_service.save_item("project", "../Bad", {})
        put_site_item.assert_not_called()

    @patch("repositories.content_repository.delete_site_item")
    def test_delete(self, delete_site_item):
        self.assertEqual(items_service.delete_item("experience", "acme"), {"deleted": True})
        delete_site_item.assert_called_once_with("EXPERIENCE#acme")


class TestUploadService(unittest.TestCase):

    @patch("clients.s3_client.presign_post", return_value={"url": "https://s3", "fields": {"key": "k"}})
    def test_presigns_a_unique_sanitised_key(self, presign_post):
        result = upload_service.create_upload("My Resume.pdf", "application/pdf")

        self.assertRegex(result["key"], r"^media/[0-9a-f]{32}/My-Resume\.pdf$")
        self.assertEqual((result["url"], result["fields"]), ("https://s3", {"key": "k"}))
        presign_post.assert_called_once_with(result["key"], "application/pdf", 10 * 1024 * 1024, 300)

    @patch("clients.s3_client.presign_post")
    def test_rejects_other_file_types(self, presign_post):
        for content_type in ["text/html", "image/svg+xml", None]:
            with self.subTest(content_type=content_type):
                with self.assertRaises(BadRequest):
                    upload_service.create_upload("x", content_type)
        presign_post.assert_not_called()


class TestAuthService(unittest.TestCase):

    @patch("clients.cognito_client.password_auth")
    def test_returns_the_access_token(self, password_auth):
        password_auth.return_value = {"AuthenticationResult": {"AccessToken": "jwt", "ExpiresIn": 3600, "IdToken": "id"}}

        self.assertEqual(auth_service.login("a@b.com", "pw"), {"accessToken": "jwt", "expiresIn": 3600, "tokenType": "Bearer"})
        password_auth.assert_called_once_with("a@b.com", "pw")

    @patch("clients.cognito_client.password_auth", return_value={"ChallengeName": "NEW_PASSWORD_REQUIRED"})
    def test_challenge_is_forbidden(self, _auth):
        with self.assertRaises(Forbidden):
            auth_service.login("a@b.com", "pw")

    @patch("clients.cognito_client.password_auth")
    def test_missing_credentials_never_reach_cognito(self, password_auth):
        for email, password in [("a@b.com", None), (None, "pw"), ("", "pw"), ("a@b.com", 123)]:
            with self.subTest(email=email, password=password):
                with self.assertRaises(BadRequest):
                    auth_service.login(email, password)
        password_auth.assert_not_called()


if __name__ == "__main__":
    unittest.main()
