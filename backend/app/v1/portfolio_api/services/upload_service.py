"""Admin media uploads: validates the file and hands back a presigned S3 POST."""
import re
import uuid

from clients import s3_client
from models.errors import BadRequest

# SVG is excluded on purpose: it can carry scripts and would be served from the site's own domain.
UPLOAD_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_EXPIRES_SECONDS = 300


def create_upload(filename: str | None, content_type: str | None) -> dict:
    if content_type not in UPLOAD_TYPES:
        raise BadRequest(f"contentType must be one of: {', '.join(sorted(UPLOAD_TYPES))}")
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", str(filename or "file"))[-100:]
    # A fresh folder per upload: keys never collide and are never served stale from the CDN cache
    key = f"media/{uuid.uuid4().hex}/{safe_name}"
    post = s3_client.presign_post(key, content_type, MAX_UPLOAD_BYTES, UPLOAD_EXPIRES_SECONDS)
    return {"key": key, **post}
