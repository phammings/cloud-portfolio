"""repositories/: the exact DynamoDB requests, with the table mocked out."""
import unittest
from decimal import Decimal
from unittest.mock import patch

from repositories import content_repository, counter_repository


class TestContentRepository(unittest.TestCase):

    @patch("repositories.content_repository.table")
    def test_list_follows_pagination(self, table):
        table.query.side_effect = [
            {"Items": [{"SK": "PROFILE"}], "LastEvaluatedKey": {"PK": "SITE", "SK": "PROFILE"}},
            {"Items": [{"SK": "PROJECT#a"}]},
        ]

        self.assertEqual(content_repository.list_site_items(), [{"SK": "PROFILE"}, {"SK": "PROJECT#a"}])
        self.assertEqual(table.query.call_count, 2)
        self.assertEqual(table.query.call_args.kwargs["ExclusiveStartKey"], {"PK": "SITE", "SK": "PROFILE"})

    @patch("repositories.content_repository.table")
    def test_put_is_one_full_item_write(self, table):
        content_repository.put_site_item("PROJECT#a", {"title": "A"})
        table.put_item.assert_called_once_with(Item={"PK": "SITE", "SK": "PROJECT#a", "title": "A"})

    @patch("repositories.content_repository.table")
    def test_delete_is_one_item_delete(self, table):
        content_repository.delete_site_item("EXPERIENCE#x")
        table.delete_item.assert_called_once_with(Key={"PK": "SITE", "SK": "EXPERIENCE#x"})


class TestCounterRepository(unittest.TestCase):

    @patch("repositories.counter_repository.table")
    def test_increment_is_an_atomic_add(self, table):
        table.update_item.return_value = {"Attributes": {"views": Decimal(3190)}}

        self.assertEqual(counter_repository.increment("VIEWS", "views"), 3190)
        kwargs = table.update_item.call_args.kwargs
        self.assertEqual(kwargs["Key"], {"PK": "COUNTER", "SK": "VIEWS"})
        self.assertEqual(kwargs["UpdateExpression"], "ADD #value :one")
        self.assertEqual(kwargs["ExpressionAttributeNames"], {"#value": "views"})


if __name__ == "__main__":
    unittest.main()
