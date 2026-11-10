"""S3 access: presigned uploads into the site bucket."""
import boto3

import config

s3 = boto3.client("s3")


def presign_post(key: str, content_type: str, max_bytes: int, expires_in: int) -> dict:
    """A presigned POST for one object. Unlike a presigned PUT, S3 itself enforces the type and size limits."""
    post = s3.generate_presigned_post(
        Bucket=config.MEDIA_BUCKET,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[{"Content-Type": content_type}, ["content-length-range", 1, max_bytes]],
        ExpiresIn=expires_in,
    )
    return {"url": post["url"], "fields": post["fields"]}
