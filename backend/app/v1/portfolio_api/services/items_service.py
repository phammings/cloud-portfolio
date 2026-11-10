"""Admin create/update/delete of content items."""
from models import items
from repositories import content_repository


def save_item(item_type: str, item_id: str, data: dict) -> dict:
    """Create or fully replace an item; key fields in `data` are ignored. Returns what was stored."""
    sk = items.sort_key(item_type, item_id)
    attributes = items.without_reserved_fields(data)
    content_repository.put_site_item(sk, attributes)
    return attributes


def delete_item(item_type: str, item_id: str) -> dict:
    content_repository.delete_site_item(items.sort_key(item_type, item_id))
    return {"deleted": True}
