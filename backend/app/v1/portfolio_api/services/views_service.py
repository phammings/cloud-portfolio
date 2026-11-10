"""The public page-view counter."""
from models.items import VIEWS_SK
from repositories import counter_repository


def count_view() -> dict:
    return {"views": counter_repository.increment(VIEWS_SK, "views")}
