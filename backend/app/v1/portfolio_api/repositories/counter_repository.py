"""DynamoDB access for counters (PK=COUNTER)."""
from models.items import COUNTER_PK
from repositories.dynamodb import table


def increment(sk: str, attribute: str) -> int:
    """Atomically add 1 to a counter and return the new value.

    DynamoDB's ADD runs server-side, so concurrent increments never overwrite each other,
    and the item is created on first use.
    """
    result = table.update_item(
        Key={"PK": COUNTER_PK, "SK": sk},
        UpdateExpression="ADD #value :one",
        ExpressionAttributeNames={"#value": attribute},
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    return int(result["Attributes"][attribute])
