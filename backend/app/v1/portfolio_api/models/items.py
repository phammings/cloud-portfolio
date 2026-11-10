"""The single-table layout: how content items are keyed and validated.

All site content shares PK=SITE so one Query returns the whole site:
    SK=PROFILE, SK=SECRET            single items (their {id} is ignored)
    SK=PROJECT#<id>, EXPERIENCE#<id> collections, ordered by each item's `order`
The view counter lives apart, at PK=COUNTER / SK=VIEWS.
"""
import re

from models.errors import BadRequest

SITE_PK = "SITE"
COUNTER_PK = "COUNTER"
VIEWS_SK = "VIEWS"

# {type} path value -> sort key, for items that exist once
SINGLE_ITEMS = {"profile": "PROFILE", "secret": "SECRET"}
# {type} path value -> sort key prefix, for collections
COLLECTIONS = {"project": "PROJECT#", "experience": "EXPERIENCE#"}
# collection type -> its list's name in the /content response
COLLECTION_FIELDS = {"project": "projects", "experience": "experience"}

ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
# Key attributes are owned by the table, never by client data
RESERVED_FIELDS = ("PK", "SK", "id")


def sort_key(item_type: str | None, item_id: str | None) -> str:
    """The SK for an item addressed as /items/{type}/{id}; raises BadRequest if either part is invalid."""
    if item_type in SINGLE_ITEMS:
        return SINGLE_ITEMS[item_type]
    if item_type not in COLLECTIONS:
        raise BadRequest(f"type must be one of: {', '.join([*SINGLE_ITEMS, *COLLECTIONS])}")
    if not ID_PATTERN.match(item_id or ""):
        raise BadRequest("id must be lowercase letters, digits and dashes (max 64)")
    return COLLECTIONS[item_type] + item_id


def classify(sk: str) -> tuple[str, str | None] | None:
    """Where an item belongs in /content: (field, id) for collections, (field, None) for single items."""
    for name, key in SINGLE_ITEMS.items():
        if sk == key:
            return name, None
    for name, prefix in COLLECTIONS.items():
        if sk.startswith(prefix):
            return COLLECTION_FIELDS[name], sk[len(prefix):]
    return None


def without_reserved_fields(data: dict) -> dict:
    return {key: value for key, value in data.items() if key not in RESERVED_FIELDS}
