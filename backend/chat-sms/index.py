"""Чат с клиентами и SMS-оповещения через SMS.ru."""
import json
import os
import base64
import uuid
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p3248579_online_booking_app")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_s3():
    import boto3
    return boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])

def send_sms(phone: str, message: str) -> dict:
    api_id = os.environ.get("SMSRU_API_ID", "")
    if not api_id:
        return {"status": "ERROR", "error": "SMS API key not configured"}
    clean = "".join(filter(str.isdigit, phone))
    if clean.startswith("8"):
        clean = "7" + clean[1:]
    params = urllib.parse.urlencode({"api_id": api_id, "to": clean, "msg": message, "json": 1})
    try:
        req = urllib.request.urlopen(f"https://sms.ru/sms/send?{params}", timeout=10)
        return json.loads(req.read().decode())
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # ===== CHAT =====

    # GET /chat-sms/chats
    if method == "GET" and path.endswith("/chats"):
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.client_name, c.client_phone, c.last_message_at, c.unread_count,
                   (SELECT content FROM {SCHEMA}.chat_messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1) as last_msg
            FROM {SCHEMA}.chats c ORDER BY c.last_message_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        chats = [{"id": r[0], "client_name": r[1], "client_phone": r[2],
                  "last_message_at": r[3].isoformat() if r[3] else None,
                  "unread_count": r[4], "last_msg": r[5]} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chats": chats}, ensure_ascii=False)}

    # GET /chat-sms/messages?chat_id=X
    if method == "GET" and path.endswith("/messages"):
        params = event.get("queryStringParameters") or {}
        chat_id = params.get("chat_id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, sender, message_type, content, file_url, file_name, is_read, created_at
            FROM {SCHEMA}.chat_messages WHERE chat_id=%s ORDER BY created_at ASC
        """, (chat_id,))
        rows = cur.fetchall()
        cur.execute(f"UPDATE {SCHEMA}.chat_messages SET is_read=TRUE WHERE chat_id=%s AND sender='client'", (chat_id,))
        cur.execute(f"UPDATE {SCHEMA}.chats SET unread_count=0 WHERE id=%s", (chat_id,))
        conn.commit()
        conn.close()
        msgs = [{"id": r[0], "sender": r[1], "type": r[2], "content": r[3],
                 "file_url": r[4], "file_name": r[5], "is_read": r[6],
                 "created_at": r[7].isoformat()} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": msgs}, ensure_ascii=False)}

    # POST /chat-sms/start — клиент начинает диалог
    if method == "POST" and path.endswith("/start"):
        body = json.loads(event.get("body") or "{}")
        name = body.get("client_name", "Клиент")
        phone = body.get("client_phone", "")
        first_msg = body.get("message", "Здравствуйте!")
        conn = get_conn()
        cur = conn.cursor()
        if phone:
            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE client_phone=%s LIMIT 1", (phone,))
            row = cur.fetchone()
            if row:
                chat_id = row[0]
                cur.execute(f"INSERT INTO {SCHEMA}.chat_messages (chat_id, sender, content) VALUES (%s,'client',%s)", (chat_id, first_msg))
                cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW(), unread_count=unread_count+1 WHERE id=%s", (chat_id,))
                conn.commit()
                conn.close()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chat_id": chat_id})}
        cur.execute(f"INSERT INTO {SCHEMA}.chats (client_name, client_phone, unread_count) VALUES (%s,%s,1) RETURNING id", (name, phone))
        chat_id = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.chat_messages (chat_id, sender, content) VALUES (%s,'client',%s)", (chat_id, first_msg))
        conn.commit()
        conn.close()
        # SMS владельцу — новый чат открыт
        phone_display = phone or "без телефона"
        send_sms("+79046015556", f"Girly Paradise: новый чат от {name} ({phone_display}). Откройте приложение чтобы ответить!")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chat_id": chat_id})}

    # POST /chat-sms/send — отправить сообщение
    if method == "POST" and path.endswith("/send"):
        body = json.loads(event.get("body") or "{}")
        chat_id = body.get("chat_id")
        sender = body.get("sender", "client")
        content = body.get("content", "")
        msg_type = body.get("type", "text")
        file_url = None
        file_name = None

        if body.get("file_data") and body.get("file_name"):
            s3 = get_s3()
            file_bytes = base64.b64decode(body["file_data"])
            fname = body["file_name"]
            key = f"chat/{chat_id}/{uuid.uuid4()}_{fname}"
            s3.put_object(Bucket="files", Key=key, Body=file_bytes)
            file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            file_name = fname
            msg_type = "image" if any(fname.lower().endswith(e) for e in [".jpg", ".jpeg", ".png", ".gif", ".webp"]) else "file"
            if not content:
                content = fname

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.chat_messages (chat_id, sender, message_type, content, file_url, file_name)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, created_at
        """, (chat_id, sender, msg_type, content, file_url, file_name))
        row = cur.fetchone()
        if sender == "client":
            cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW(), unread_count=unread_count+1 WHERE id=%s", (chat_id,))
            # Получаем имя клиента для SMS
            cur.execute(f"SELECT client_name, unread_count FROM {SCHEMA}.chats WHERE id=%s", (chat_id,))
            chat_row = cur.fetchone()
            client_name = chat_row[0] if chat_row else "Клиент"
            unread = chat_row[1] if chat_row else 1
        else:
            cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW() WHERE id=%s", (chat_id,))
            client_name = None
            unread = 0
        conn.commit()
        conn.close()

        # SMS владельцу — только первое сообщение или каждое 3-е чтобы не спамить
        if sender == "client" and unread in (1, 4, 7):
            owner_phone = "+79046015556"
            preview = (content or "📎 файл")[:60]
            sms_text = f"Girly Paradise: новое сообщение от {client_name}: «{preview}». Ответьте в приложении!"
            send_sms(owner_phone, sms_text)

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()})}

    # ===== SMS =====

    # POST /chat-sms/sms/send
    if method == "POST" and path.endswith("/sms/send"):
        body = json.loads(event.get("body") or "{}")
        phone = body.get("phone", "")
        message = body.get("message", "")
        if not phone or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "phone and message required"})}
        result = send_sms(phone, message)
        conn = get_conn()
        cur = conn.cursor()
        status = "sent" if result.get("status") == "OK" else "error"
        cur.execute(f"INSERT INTO {SCHEMA}.sms_log (phone, message, status) VALUES (%s,%s,%s)", (phone, message, status))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"result": result, "status": status}, ensure_ascii=False)}

    # GET /chat-sms/sms/log
    if method == "GET" and path.endswith("/sms/log"):
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, phone, message, status, created_at FROM {SCHEMA}.sms_log ORDER BY created_at DESC LIMIT 50")
        rows = cur.fetchall()
        conn.close()
        logs = [{"id": r[0], "phone": r[1], "message": r[2], "status": r[3], "created_at": r[4].isoformat()} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"logs": logs}, ensure_ascii=False)}

    # GET /chat-sms/sms/templates
    if method == "GET" and path.endswith("/sms/templates"):
        templates = [
            {"id": 1, "name": "Подтверждение записи", "text": "Girly Paradise: Ваша запись на {service} {date} в {time} подтверждена. Ждём вас!"},
            {"id": 2, "name": "Напоминание за день", "text": "Girly Paradise: Напоминаем, завтра у вас запись на {service} в {time}. До встречи!"},
            {"id": 3, "name": "Акция", "text": "Girly Paradise: Для вас специальное предложение! {promo}. Записаться: +7(904)601-55-56"},
            {"id": 4, "name": "Перенос записи", "text": "Girly Paradise: Ваша запись перенесена на {date} в {time}. Вопросы: +7(904)601-55-56"},
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"templates": templates}, ensure_ascii=False)}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}