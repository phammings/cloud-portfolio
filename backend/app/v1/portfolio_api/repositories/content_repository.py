"""DynamoDB access for site content (PK=SITE). Every write is a single-item request, so each is atomic."""
from boto3.dynamodb.conditions import Key

from models.items import SITE_PK
from repositories.dynamodb import table


def list_site_items() -> list[dict]:
    """Every item under PK=SITE, following pagination. Items are returned exactly as stored, keys included."""
    items, kwargs = [], {"KeyConditionExpression": Key("PK").eq(SITE_PK)}
    while True:
        page = table.query(**kwargs)
        items += page["Items"]
        if "LastEvaluatedKey" not in page:
            return items
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def put_site_item(sk: str, attributes: dict) -> None:
    """Create or fully replace one item."""
    table.put_item(Item={"PK": SITE_PK, "SK": sk, **attributes})


def delete_site_item(sk: str) -> None:
    """Delete one item. Deleting an item that doesn't exist is not an error."""
    table.delete_item(Key={"PK": SITE_PK, "SK": sk})
