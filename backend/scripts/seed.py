"""One-off: load the old site's content into the portfolio table and media/ in S3.

Run from the repo root with admin AWS credentials:
    python backend/scripts/seed.py           # refuses if content already exists
    python backend/scripts/seed.py --force   # overwrites seeded items (admin edits to them are lost)
"""
import json
import mimetypes
import re
import sys
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

REGION = "ca-central-1"
BUCKET = "ryanpham-cloud-resume"
WEBSITE = Path("website")

table = boto3.resource("dynamodb", region_name=REGION).Table("portfolio")
s3 = boto3.client("s3", region_name=REGION)


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:64]


def upload(path, key):
    content_type = mimetypes.guess_type(path.name)[0]
    s3.upload_file(str(path), BUCKET, key, ExtraArgs={"ContentType": content_type})
    print(f"uploaded {key}")
    return key


def main():
    existing = table.query(KeyConditionExpression=Key("PK").eq("SITE"), Limit=1)["Items"]
    if existing and "--force" not in sys.argv:
        sys.exit("Content already exists in the portfolio table; rerun with --force to overwrite.")

    resume_key = upload(WEBSITE / "public/Ryan_Pham_resume.pdf", "media/resume/Ryan_Pham_resume.pdf")
    table.put_item(Item={
        "PK": "SITE",
        "SK": "PROFILE",
        "name": "Ryan Pham",
        "tagline": "Software Engineer",
        "about": (
            "My unique blend of technical expertise, creative thinking, and background in psychology "
            "allows me to approach each project with a deep understanding of the end user's perspective, "
            "resulting in highly effective user-centred digital products."
        ),
        "location": "Toronto, ON, Canada",
        "email": "ryanlepham9@gmail.com",
        "socials": {
            "github": "https://github.com/phammings",
            "linkedin": "https://www.linkedin.com/in/ryan-pham-b102051a2/",
        },
        "resumeKey": resume_key,
    })
    print("wrote PROFILE")

    projects = json.loads((WEBSITE / "src/_data/projects.json").read_text())
    for order, project in enumerate(projects, start=1):
        # The old ids collide (two 3s and two 8s), so key projects by a title slug instead.
        project_id = slugify(project["title"])
        image_paths = dict.fromkeys(project[f] for f in ("image", "image2", "image3") if project.get(f))
        images = [
            upload(WEBSITE / "public" / path.lstrip("/"), f"media/projects/{Path(path).name}")
            for path in image_paths
        ]
        table.put_item(Item={
            "PK": "SITE",
            "SK": f"PROJECT#{project_id}",
            "title": project["title"],
            "summary": project["description"],
            "body": project["body"],
            "tech": project["technologies"],
            "images": images,
            "github": project.get("github", ""),
            "liveUrl": project.get("deployed", ""),
            "order": order,
            "featured": order <= 3,
        })
        print(f"wrote PROJECT#{project_id}")


if __name__ == "__main__":
    main()
