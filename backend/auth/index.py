"""
Регистрация и вход клиентов по номеру телефона. v2
POST /register — регистрация нового клиента
POST /login — вход по телефону
"""
import json
import os
import psycopg2

SCHEMA = "t_p3248579_online_booking_app"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "register")
    phone = (body.get("phone") or "").strip()
    name = (body.get("name") or "").strip()

    if not phone:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите номер телефона"})}

    conn = get_conn()
    cur = conn.cursor()

    birthdate = (body.get("birthdate") or "").strip()

    if action == "register":
        if not name:
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите имя"})}
        cur.execute(f"SELECT id, name FROM {SCHEMA}.clients WHERE phone = '{phone}'")
        existing = cur.fetchone()
        if existing:
            conn.close()
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True, "client": {"id": existing[0], "name": existing[1], "phone": phone}, "message": "Вы уже зарегистрированы"})}
        if birthdate:
            cur.execute(f"INSERT INTO {SCHEMA}.clients (name, phone, birthdate) VALUES ('{name}', '{phone}', '{birthdate}') RETURNING id")
        else:
            cur.execute(f"INSERT INTO {SCHEMA}.clients (name, phone) VALUES ('{name}', '{phone}') RETURNING id")
        client_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True, "client": {"id": client_id, "name": name, "phone": phone}})}

    elif action == "login":
        cur.execute(f"SELECT id, name FROM {SCHEMA}.clients WHERE phone = '{phone}'")
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "Клиент не найден. Пройдите регистрацию."})}
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True, "client": {"id": row[0], "name": row[1], "phone": phone}})}

    conn.close()
    return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Неизвестное действие"})}