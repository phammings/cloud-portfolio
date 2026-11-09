import json
import unittest
from decimal import Decimal
from unittest.mock import patch

from handler import lambda_handler


def call(route_key):
    response = lambda_handler({"routeKey": route_key}, None)
    return response["statusCode"], json.loads(response["body"])


class TestHandler(unittest.TestCase):

    @patch("handler.table")
    def test_content_groups_and_sorts_items(self, mock_table):
        mock_table.query.side_effect = [
            {
                "Items": [
                    {"PK": "SITE", "SK": "PROFILE", "name": "Ryan"},
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


if __name__ == "__main__":
    unittest.main()
