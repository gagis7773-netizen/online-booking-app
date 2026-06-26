"""
Админ API для Girly Paradise — панель владельца.
Разделы: stats, schedule, expenses, notifications, gallery, clients
"""
import json
import os
import psycopg2
import psycopg2.extras
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.parse

SCHEMA = "t_p3248579_online_booking_app"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def resp(data, code=200):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}

def send_sms(phone, message):
    api_id = os.environ.get("SMSRU_API_ID", "")
    if not api_id:
        return False
    clean = ''.join(c for c in phone if c.isdigit())
    if clean.startswith('8'):
        clean = '7' + clean[1:]
    params = urllib.parse.urlencode({
        "api_id": api_id,
        "to": clean,
        "msg": message,
        "json": 1,
    })
    try:
        req = urllib.request.urlopen(f"https://sms.ru/sms/send?{params}", timeout=10)
        return True
    except:
        return False

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    body = json.loads(event.get("body") or "{}")

    section = body.get("section") or (path.split("/")[-1] if "/" in path else "stats")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── СТАТИСТИКА ──
    if section == "stats" or (method == "GET" and "stats" in path):
        cur.execute(f"SELECT COUNT(*) as total FROM {SCHEMA}.clients")
        clients_total = cur.fetchone()["total"]

        cur.execute(f"SELECT COUNT(*) as total FROM {SCHEMA}.bookings")
        bookings_total = cur.fetchone()["total"]

        cur.execute(f"SELECT COUNT(*) as total FROM {SCHEMA}.bookings WHERE created_at >= NOW() - INTERVAL '30 days'")
        bookings_month = cur.fetchone()["total"]

        cur.execute(f"SELECT COUNT(*) as total FROM {SCHEMA}.schedule WHERE status = 'confirmed' AND booking_date >= TO_CHAR(NOW(), 'YYYY-MM-DD')")
        upcoming = cur.fetchone()["total"]

        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as total FROM {SCHEMA}.expenses WHERE expense_date >= DATE_TRUNC('month', NOW())")
        expenses_month = float(cur.fetchone()["total"])

        conn.close()
        return resp({
            "clients_total": clients_total,
            "bookings_total": bookings_total,
            "bookings_month": bookings_month,
            "upcoming": upcoming,
            "expenses_month": expenses_month,
        })

    # ── РАСПИСАНИЕ ──
    if section == "schedule":
        if method == "GET":
            cur.execute(f"""
                SELECT * FROM {SCHEMA}.schedule
                ORDER BY booking_date DESC, booking_time ASC
                LIMIT 50
            """)
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return resp({"schedule": rows})

        if method == "POST":
            action = body.get("action", "add")
            if action == "add":
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.schedule
                    (client_name, client_phone, services, master, booking_date, booking_time, status, notes)
                    VALUES (%(cn)s, %(cp)s, %(sv)s, %(m)s, %(d)s, %(t)s, %(st)s, %(n)s)
                    RETURNING id
                """, {
                    "cn": body.get("client_name", ""),
                    "cp": body.get("client_phone", ""),
                    "sv": body.get("services", ""),
                    "m": body.get("master", "Галина"),
                    "d": body.get("booking_date", ""),
                    "t": body.get("booking_time", ""),
                    "st": body.get("status", "confirmed"),
                    "n": body.get("notes", ""),
                })
                row_id = cur.fetchone()["id"]
                conn.commit()
                conn.close()
                return resp({"ok": True, "id": row_id})

            if action == "delete":
                cur.execute(f"DELETE FROM {SCHEMA}.schedule WHERE id = %(id)s", {"id": body.get("id")})
                conn.commit()
                conn.close()
                return resp({"ok": True})

            if action == "update_status":
                cur.execute(f"UPDATE {SCHEMA}.schedule SET status = %(s)s WHERE id = %(id)s",
                            {"s": body.get("status"), "id": body.get("id")})
                conn.commit()
                conn.close()
                return resp({"ok": True})

    # ── РАСХОДЫ ──
    if section == "expenses":
        if method == "GET":
            cur.execute(f"SELECT * FROM {SCHEMA}.expenses ORDER BY expense_date DESC, created_at DESC LIMIT 100")
            rows = [dict(r) for r in cur.fetchall()]
            cur.execute(f"SELECT COALESCE(SUM(amount),0) as total FROM {SCHEMA}.expenses")
            total = float(cur.fetchone()["total"])
            cur.execute(f"SELECT COALESCE(SUM(amount),0) as total FROM {SCHEMA}.expenses WHERE expense_date >= DATE_TRUNC('month', NOW())")
            month = float(cur.fetchone()["total"])
            conn.close()
            return resp({"expenses": rows, "total": total, "month": month})

        if method == "POST":
            action = body.get("action", "add")
            if action == "add":
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.expenses (title, amount, category, expense_date, notes)
                    VALUES (%(t)s, %(a)s, %(c)s, %(d)s, %(n)s) RETURNING id
                """, {
                    "t": body.get("title", ""),
                    "a": float(body.get("amount", 0)),
                    "c": body.get("category", "Прочее"),
                    "d": body.get("expense_date", ""),
                    "n": body.get("notes", ""),
                })
                row_id = cur.fetchone()["id"]
                conn.commit()
                conn.close()
                return resp({"ok": True, "id": row_id})

            if action == "delete":
                cur.execute(f"DELETE FROM {SCHEMA}.expenses WHERE id = %(id)s", {"id": body.get("id")})
                conn.commit()
                conn.close()
                return resp({"ok": True})

    # ── УВЕДОМЛЕНИЯ / SMS ──
    if section == "notifications":
        if method == "GET":
            cur.execute(f"SELECT n.*, c.name as client_name FROM {SCHEMA}.notifications n LEFT JOIN {SCHEMA}.clients c ON c.id = n.client_id ORDER BY n.created_at DESC LIMIT 50")
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return resp({"notifications": rows})

        if method == "POST":
            action = body.get("action", "send")
            if action == "send":
                phone = body.get("phone", "")
                message = body.get("message", "")
                client_id = body.get("client_id")
                ok = send_sms(phone, message)
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.notifications (client_id, client_phone, message, status, sent_at)
                    VALUES (%(cid)s, %(p)s, %(m)s, %(s)s, NOW())
                """, {
                    "cid": client_id,
                    "p": phone,
                    "m": message,
                    "s": "sent" if ok else "failed",
                })
                conn.commit()
                conn.close()
                return resp({"ok": True, "sms_sent": ok})

            if action == "send_all":
                message = body.get("message", "")
                cur.execute(f"SELECT id, phone FROM {SCHEMA}.clients")
                clients = cur.fetchall()
                count = 0
                for c in clients:
                    ok = send_sms(c["phone"], message)
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.notifications (client_id, client_phone, message, status, sent_at)
                        VALUES (%(cid)s, %(p)s, %(m)s, %(s)s, NOW())
                    """, {
                        "cid": c["id"],
                        "p": c["phone"],
                        "m": message,
                        "s": "sent" if ok else "failed",
                    })
                    if ok:
                        count += 1
                conn.commit()
                conn.close()
                return resp({"ok": True, "sent": count})

    # ── ГАЛЕРЕЯ ──
    if section == "gallery":
        if method == "GET":
            cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery ORDER BY created_at DESC")
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return resp({"gallery": rows})

        if method == "POST":
            action = body.get("action", "add")
            if action == "add":
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.admin_gallery (title, url, category)
                    VALUES (%(t)s, %(u)s, %(c)s) RETURNING id
                """, {
                    "t": body.get("title", ""),
                    "u": body.get("url", ""),
                    "c": body.get("category", "До и после"),
                })
                row_id = cur.fetchone()["id"]
                conn.commit()
                conn.close()
                return resp({"ok": True, "id": row_id})

            if action == "delete":
                cur.execute(f"DELETE FROM {SCHEMA}.admin_gallery WHERE id = %(id)s", {"id": body.get("id")})
                conn.commit()
                conn.close()
                return resp({"ok": True})

    # ── КЛИЕНТЫ ──
    if section == "clients":
        cur.execute(f"""
            SELECT c.id, c.name, c.phone, c.created_at,
                   COUNT(b.id) AS bookings_count,
                   MAX(b.created_at) AS last_booking
            FROM {SCHEMA}.clients c
            LEFT JOIN {SCHEMA}.bookings b ON b.client_id = c.id
            GROUP BY c.id ORDER BY c.created_at DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return resp({"clients": rows, "total": len(rows)})

    # ── СООБЩЕНИЯ (чаты) ──
    if section == "messages":
        cur.execute(f"""
            SELECT ch.id, ch.client_name, ch.client_phone, ch.created_at,
                   COUNT(cm.id) as msg_count,
                   MAX(cm.created_at) as last_msg
            FROM {SCHEMA}.chats ch
            LEFT JOIN {SCHEMA}.chat_messages cm ON cm.chat_id = ch.id
            GROUP BY ch.id ORDER BY last_msg DESC NULLS LAST
            LIMIT 50
        """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return resp({"chats": rows})

    conn.close()
    return resp({"error": "Unknown section"}, 400)
