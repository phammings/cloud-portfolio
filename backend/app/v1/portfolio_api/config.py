"""Settings read from the Lambda's environment (set in backend/terraform/api.tf)."""
import os

TABLE_NAME = os.environ.get("TABLE_NAME", "portfolio")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
