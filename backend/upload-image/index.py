"""
Загрузка изображений в S3 хранилище.
Принимает base64-encoded изображение, сохраняет в S3, возвращает CDN URL.
"""
import json
import os
import base64
import uuid
import boto3


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    """Загрузка фото с телефона в S3, возвращает публичный URL."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    image_data = body.get("image")  # base64 строка
    folder = body.get("folder", "uploads")  # gallery / pricelist / documents / avatars

    if not image_data:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "No image"})}

    # Определяем тип и декодируем
    if "," in image_data:
        header, data = image_data.split(",", 1)
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
            content_type = "image/jpeg"
        elif "png" in header:
            ext = "png"
            content_type = "image/png"
        elif "webp" in header:
            ext = "webp"
            content_type = "image/webp"
        else:
            ext = "jpg"
            content_type = "image/jpeg"
    else:
        data = image_data
        ext = "jpg"
        content_type = "image/jpeg"

    image_bytes = base64.b64decode(data)
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    s3.put_object(
        Bucket="files",
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "url": cdn_url}),
    }
