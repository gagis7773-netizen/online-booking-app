"""GET и POST отзывов клиентов — лёгкая функция без boto3 при GET."""
import json
import os
import base64
import uuid
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p3248579_online_booking_app")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    print(f"[reviews] {method} path={event.get('path')}")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, client_name, rating, review_text, photo_url, service, created_at "
            f"FROM {SCHEMA}.reviews WHERE is_approved=TRUE ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        conn.close()
        reviews = [
            {"id": r[0], "client_name": r[1], "rating": r[2], "text": r[3],
             "photo_url": r[4], "service": r[5], "created_at": r[6].isoformat()}
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"reviews": reviews}, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        print(f"[reviews] POST client={body.get('client_name')} rating={body.get('rating')}")

        photo_url = None
        if body.get("photo_data") and body.get("photo_name"):
            try:
                s3 = boto3.client(
                    "s3", endpoint_url="https://bucket.poehali.dev",
                    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"]
                )
                data = base64.b64decode(body["photo_data"])
                key = f"reviews/{uuid.uuid4()}_{body['photo_name']}"
                s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/jpeg")
                photo_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
                print(f"[reviews] photo uploaded: {photo_url}")
            except Exception as e:
                print(f"[reviews] photo upload error (ignored): {e}")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.reviews (client_name, rating, review_text, photo_url, service, is_approved) "
            f"VALUES (%s,%s,%s,%s,%s,TRUE) RETURNING id",
            (body.get("client_name", "Анонимно"), int(body.get("rating", 5)),
             body.get("text"), photo_url, body.get("service"))
        )
        rid = cur.fetchone()[0]
        conn.commit()
        conn.close()
        print(f"[reviews] saved id={rid}")
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"id": rid, "success": True})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
