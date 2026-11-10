"""app.py: routing, request parsing and turning results/errors into HTTP responses."""
import base64
import json
import unittest
from decimal import Decimal
from unittest.mock import patch

import app
from models.errors import Forbidden


def call(route_key, body=None, **path):
    event = {"routeKey": route_key, "pathParameters": path, "body": body}
    response = app.lambda_handler(event, None)
    return response["statusCode"], json.loads(response["body"])


class TestApp(unittest.TestCase):

    def test_unknown_route_is_404(self):
        self.assertEqual(call("GET /nope"), (404, {"message": "Not found"}))

    @patch("services.items_service.save_item", return_value={"title": "X"})
    def test_put_route_passes_path_and_body_to_the_service(self, save_item):
        status, body = call("PUT /items/{type}/{id}", '{"title": "X", "rating": 4.5}', type="project", id="x")

        self.assertEqual((status, body), (200, {"title": "X"}))
        save_item.assert_called_once_with("project", "x", {"title": "X", "rating": Decimal("4.5")})

    @patch("services.items_service.delete_item", return_value={"deleted": True})
    def test_delete_route(self, delete_item):
        self.assertEqual(call("DELETE /items/{type}/{id}", type="experience", id="acme"), (200, {"deleted": True}))
        delete_item.assert_called_once_with("experience", "acme")

    @patch("services.auth_service.login", side_effect=Forbidden("needs another step"))
    def test_domain_errors_become_their_status(self, _login):
        self.assertEqual(call("POST /login", '{"email": "a", "password": "b"}'), (403, {"message": "needs another step"}))

    @patch("services.views_service.count_view", return_value={"views": Decimal(3), "ratio": Decimal("0.5")})
    def test_decimals_serialize_as_numbers(self, _count_view):
        self.assertEqual(call("POST /views"), (200, {"views": 3, "ratio": 0.5}))

    @patch("services.items_service.save_item")
    def test_bad_bodies_are_rejected_before_the_service(self, save_item):
        for body in ["not json", "[1]", "x" * 100_001, None]:
            with self.subTest(body=str(body)[:20]):
                status, _ = call("PUT /items/{type}/{id}", body, type="project", id="a")
                self.assertEqual(status, 400)
        save_item.assert_not_called()

    @patch("services.upload_service.create_upload", return_value={"key": "k"})
    def test_base64_bodies_are_decoded(self, create_upload):
        encoded = base64.b64encode(b'{"filename": "a.pdf", "contentType": "application/pdf"}').decode()
        event = {"routeKey": "POST /uploads", "body": encoded, "isBase64Encoded": True}

        self.assertEqual(app.lambda_handler(event, None)["statusCode"], 200)
        create_upload.assert_called_once_with("a.pdf", "application/pdf")


if __name__ == "__main__":
    unittest.main()
