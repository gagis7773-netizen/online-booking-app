"""Контент: акции, галерея до/после, отзывы клиентов, прайс-лист."""
import json
import os
import base64
import uuid
import datetime
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p3248579_online_booking_app")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

SERVICES = [
    {"name": "Криолиполиз", "category": "Тело", "price": "от 3 500 ₽", "duration": "60 мин"},
    {"name": "Вакуумный массаж", "category": "Тело", "price": "от 2 000 ₽", "duration": "60 мин"},
    {"name": "СМАС-лифтинг", "category": "Лицо", "price": "от 8 000 ₽", "duration": "90 мин"},
    {"name": "Биоревитализация и мезо без иглы", "category": "Лицо", "price": "от 4 000 ₽", "duration": "60 мин"},
    {"name": "Микроигольчатый РФ-лифтинг", "category": "Лицо", "price": "от 5 000 ₽", "duration": "60 мин"},
    {"name": "Увеличение губ без иглы", "category": "Лицо", "price": "от 3 500 ₽", "duration": "45 мин"},
    {"name": "Уходовые процедуры по лицу", "category": "Лицо", "price": "от 2 500 ₽", "duration": "60 мин"},
    {"name": "СПА-программы", "category": "Тело", "price": "от 4 000 ₽", "duration": "90 мин"},
    {"name": "Микронидлинг", "category": "Лицо", "price": "от 4 500 ₽", "duration": "60 мин"},
    {"name": "Липолитики", "category": "Тело", "price": "от 3 000 ₽", "duration": "45 мин"},
    {"name": "Волосы", "category": "Волосы", "price": "уточнить", "duration": "60 мин"},
    {"name": "РФ-лифтинг тело и лицо", "category": "Лицо", "price": "от 3 500 ₽", "duration": "60 мин"},
]

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_s3():
    return boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])

def upload_image(s3, folder, name, data_b64):
    data = base64.b64decode(data_b64)
    key = f"{folder}/{uuid.uuid4()}_{name}"
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/jpeg")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}

    # ===== PROMOTIONS =====
    if "/promotions" in path:
        if method == "GET":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"""
                SELECT id, title, description, discount_text, image_url, valid_until, created_at
                FROM {SCHEMA}.promotions WHERE is_active=TRUE ORDER BY created_at DESC
            """)
            rows = cur.fetchall()
            conn.close()
            promos = [{"id": r[0], "title": r[1], "description": r[2], "discount_text": r[3],
                       "image_url": r[4], "valid_until": str(r[5]) if r[5] else None,
                       "created_at": r[6].isoformat()} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"promotions": promos}, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            image_url = None
            if body.get("image_data") and body.get("image_name"):
                image_url = upload_image(get_s3(), "promotions", body["image_name"], body["image_data"])
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.promotions (title, description, discount_text, image_url, valid_until)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("title"), body.get("description"), body.get("discount_text"), image_url, body.get("valid_until") or None))
            pid = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": pid})}

    # ===== GALLERY =====
    if "/gallery" in path:
        if method == "GET":
            conn = get_conn()
            cur = conn.cursor()
            cat = params.get("category")
            if cat:
                cur.execute(f"SELECT id, category, before_url, after_url, description, created_at FROM {SCHEMA}.gallery WHERE category=%s ORDER BY created_at DESC", (cat,))
            else:
                cur.execute(f"SELECT id, category, before_url, after_url, description, created_at FROM {SCHEMA}.gallery ORDER BY created_at DESC")
            rows = cur.fetchall()
            conn.close()
            items = [{"id": r[0], "category": r[1], "before_url": r[2], "after_url": r[3],
                      "description": r[4], "created_at": r[5].isoformat()} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"gallery": items}, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            s3 = get_s3()
            before_url = upload_image(s3, "gallery", body["before_name"], body["before_data"]) if body.get("before_data") else None
            after_url = upload_image(s3, "gallery", body["after_name"], body["after_data"]) if body.get("after_data") else None
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {SCHEMA}.gallery (category, before_url, after_url, description) VALUES (%s,%s,%s,%s) RETURNING id",
                        (body.get("category"), before_url, after_url, body.get("description")))
            gid = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": gid})}

    # ===== REVIEWS =====
    if "/reviews" in path:
        if method == "GET":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT id, client_name, rating, review_text, photo_url, service, created_at FROM {SCHEMA}.reviews WHERE is_approved=TRUE ORDER BY created_at DESC")
            rows = cur.fetchall()
            conn.close()
            reviews = [{"id": r[0], "client_name": r[1], "rating": r[2], "text": r[3],
                        "photo_url": r[4], "service": r[5], "created_at": r[6].isoformat()} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reviews": reviews}, ensure_ascii=False)}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            photo_url = None
            if body.get("photo_data") and body.get("photo_name"):
                photo_url = upload_image(get_s3(), "reviews", body["photo_name"], body["photo_data"])
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {SCHEMA}.reviews (client_name, rating, review_text, photo_url, service) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                        (body.get("client_name", "Анонимно"), int(body.get("rating", 5)), body.get("text"), photo_url, body.get("service")))
            rid = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": rid, "success": True})}

    # ===== PRICELIST =====
    if "/pricelist" in path:
        fmt = params.get("format", "json")
        if fmt == "csv":
            lines = ["Услуга,Категория,Стоимость,Длительность"]
            for s in SERVICES:
                lines.append(f'"{s["name"]}","{s["category"]}","{s["price"]}","{s["duration"]}"')
            csv_content = "\n".join(lines)
            encoded = base64.b64encode(csv_content.encode("utf-8-sig")).decode()
            return {"statusCode": 200, "headers": {**CORS, "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": "attachment; filename=girly_paradise_price.csv"},
                    "body": encoded, "isBase64Encoded": True}

        if fmt == "html":
            rows_html = ""
            for s in SERVICES:
                rows_html += f"<tr><td>{s['name']}</td><td>{s['category']}</td><td>{s['price']}</td><td>{s['duration']}</td></tr>\n"
            today = datetime.date.today().strftime("%d.%m.%Y")
            html = f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Прайс Girly Paradise</title>
<style>body{{font-family:Arial,sans-serif;padding:20px;color:#333}}h1{{color:#c2185b}}
table{{width:100%;border-collapse:collapse}}th{{background:#f8bbd0;color:#c2185b;padding:10px;text-align:left}}
td{{padding:10px;border-bottom:1px solid #fce4ec}}tr:hover td{{background:#fff5f7}}
.footer{{margin-top:20px;color:#999;font-size:12px}}</style></head>
<body><h1>Girly Paradise Beauty Studio</h1>
<p>ул. Заречная, 10 · м. Парнас · +7(904)601-55-56 · Ежедневно 11:00–20:00</p>
<table><thead><tr><th>Услуга</th><th>Категория</th><th>Стоимость</th><th>Длительность</th></tr></thead>
<tbody>{rows_html}</tbody></table>
<div class="footer">* Цены уточняются на консультации. Актуально на {today}.</div>
</body></html>"""
            encoded = base64.b64encode(html.encode("utf-8")).decode()
            return {"statusCode": 200, "headers": {**CORS, "Content-Type": "text/html; charset=utf-8",
                    "Content-Disposition": "attachment; filename=girly_paradise_price.html"},
                    "body": encoded, "isBase64Encoded": True}

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"services": SERVICES}, ensure_ascii=False)}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
