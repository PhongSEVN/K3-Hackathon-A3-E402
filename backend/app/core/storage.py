import json
from datetime import timedelta
from io import BytesIO

from minio import Minio

from app.core.config import settings

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_use_ssl,
)


def _public_read_policy(bucket: str) -> str:
    return json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"],
                }
            ],
        }
    )


def ensure_buckets() -> None:
    if not client.bucket_exists(settings.minio_bucket_plant_images):
        client.make_bucket(settings.minio_bucket_plant_images)

    if not client.bucket_exists(settings.minio_bucket_avatars):
        client.make_bucket(settings.minio_bucket_avatars)
    client.set_bucket_policy(
        settings.minio_bucket_avatars, _public_read_policy(settings.minio_bucket_avatars)
    )


def upload_object(bucket: str, object_name: str, data: bytes, content_type: str) -> str:
    client.put_object(bucket, object_name, BytesIO(data), length=len(data), content_type=content_type)
    return f"{bucket}/{object_name}"


def get_presigned_url(bucket: str, object_name: str, expires_minutes: int = 60) -> str:
    return client.presigned_get_object(bucket, object_name, expires=timedelta(minutes=expires_minutes))


def count_objects(bucket: str) -> int:
    return sum(1 for _ in client.list_objects(bucket, recursive=True))
