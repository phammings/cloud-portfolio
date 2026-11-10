"""The shared DynamoDB table handle, created once per Lambda container and reused across invocations."""
import boto3

import config

table = boto3.resource("dynamodb").Table(config.TABLE_NAME)
