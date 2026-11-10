"""models/items.py: key layout and validation rules."""
import unittest

from models import items
from models.errors import BadRequest


class TestItems(unittest.TestCase):

    def test_sort_keys(self):
        self.assertEqual(items.sort_key("project", "airbnb-clone"), "PROJECT#airbnb-clone")
        self.assertEqual(items.sort_key("experience", "acme"), "EXPERIENCE#acme")
        # single items ignore the id entirely
        self.assertEqual(items.sort_key("profile", "anything"), "PROFILE")
        self.assertEqual(items.sort_key("secret", None), "SECRET")

    def test_invalid_type_or_id_is_rejected(self):
        for item_type, item_id in [("user", "a"), (None, "a"), ("project", "../Bad"), ("project", ""), ("project", "A"), ("project", "a" * 65)]:
            with self.subTest(item_type=item_type, item_id=item_id):
                with self.assertRaises(BadRequest):
                    items.sort_key(item_type, item_id)

    def test_classify(self):
        self.assertEqual(items.classify("PROFILE"), ("profile", None))
        self.assertEqual(items.classify("SECRET"), ("secret", None))
        self.assertEqual(items.classify("PROJECT#a"), ("projects", "a"))
        self.assertEqual(items.classify("EXPERIENCE#b"), ("experience", "b"))
        self.assertIsNone(items.classify("SOMETHING_ELSE"))

    def test_reserved_fields_are_dropped(self):
        self.assertEqual(items.without_reserved_fields({"PK": "X", "SK": "Y", "id": "z", "title": "T"}), {"title": "T"})


if __name__ == "__main__":
    unittest.main()
