"""Assembles the public /content response from the stored items."""
from models import items
from repositories import content_repository


def get_content() -> dict:
    """Profile, secret slideshow, projects and experience; collections sorted by `order`."""
    content = {"profile": None, "secret": None, "projects": [], "experience": []}
    for stored in content_repository.list_site_items():
        placement = items.classify(stored["SK"])
        if placement is None:
            continue  # an item type this version doesn't serve
        field, item_id = placement
        data = items.without_reserved_fields(stored)
        if item_id is None:
            content[field] = data
        else:
            content[field].append({"id": item_id, **data})

    for field in items.COLLECTION_FIELDS.values():
        content[field].sort(key=lambda item: item.get("order", 0))
    return content
