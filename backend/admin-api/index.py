"""
Админ API для Girly Paradise — панель владельца. v2
Авторизация по PIN, разделы: stats, schedule, expenses, notifications, gallery, clients, staff
"""
import json
import os
import psycopg2
import psycopg2.extras
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
        urllib.request.urlopen(f"https://sms.ru/sms/send?{params}", timeout=10)
        return True
    except:
        return False

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    section = body.get("section", "stats")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── АВТОРИЗАЦИЯ ──
    if section == "auth":
        pin = str(body.get("pin", "")).strip()
        cur.execute(f"SELECT id, name, role, pin FROM {SCHEMA}.staff WHERE pin = %s AND is_active = true", (pin,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return resp({"ok": False, "error": "Неверный пин-код"}, 401)
        return resp({"ok": True, "staff": {"id": row["id"], "name": row["name"], "role": row["role"]}})

    # ── СТАТИСТИКА ──
    if section == "stats":
        cur.execute(f"SELECT COUNT(*) as v FROM {SCHEMA}.clients")
        clients_total = cur.fetchone()["v"]

        cur.execute(f"SELECT COUNT(*) as v FROM {SCHEMA}.bookings")
        bookings_total = cur.fetchone()["v"]

        cur.execute(f"SELECT COUNT(*) as v FROM {SCHEMA}.bookings WHERE created_at >= NOW() - INTERVAL '30 days'")
        bookings_month = cur.fetchone()["v"]

        cur.execute(f"SELECT COUNT(*) as v FROM {SCHEMA}.clients WHERE created_at >= NOW() - INTERVAL '30 days'")
        clients_month = cur.fetchone()["v"]

        cur.execute(f"SELECT COUNT(*) as v FROM {SCHEMA}.schedule WHERE status = 'confirmed'")
        schedule_total = cur.fetchone()["v"]

        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as v FROM {SCHEMA}.expenses")
        expenses_total = float(cur.fetchone()["v"])

        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as v FROM {SCHEMA}.expenses WHERE expense_date >= DATE_TRUNC('month', NOW())")
        expenses_month = float(cur.fetchone()["v"])

        cur.execute(f"SELECT COALESCE(SUM(amount), 0) as v FROM {SCHEMA}.expenses WHERE expense_date >= DATE_TRUNC('week', NOW())")
        expenses_week = float(cur.fetchone()["v"])

        cur.execute(f"""
            SELECT TO_CHAR(created_at, 'Mon') as mon, COUNT(*) as cnt
            FROM {SCHEMA}.bookings
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        """)
        bookings_chart = [dict(r) for r in cur.fetchall()]

        cur.execute(f"""
            SELECT TO_CHAR(created_at, 'Mon') as mon, COUNT(*) as cnt
            FROM {SCHEMA}.clients
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        """)
        clients_chart = [dict(r) for r in cur.fetchall()]

        conn.close()
        return resp({
            "clients_total": clients_total,
            "clients_month": clients_month,
            "bookings_total": bookings_total,
            "bookings_month": bookings_month,
            "schedule_total": schedule_total,
            "expenses_total": expenses_total,
            "expenses_month": expenses_month,
            "expenses_week": expenses_week,
            "bookings_chart": bookings_chart,
            "clients_chart": clients_chart,
        })

    # ── РАСПИСАНИЕ ──
    if section == "schedule":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.schedule
                (client_name, client_phone, services, master, booking_date, booking_time, status, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("client_name",""), body.get("client_phone",""), body.get("services",""),
                  body.get("master","Галина"), body.get("booking_date",""), body.get("booking_time",""),
                  body.get("status","confirmed"), body.get("notes","")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close()
            return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.schedule WHERE id = %s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "update_status":
            cur.execute(f"UPDATE {SCHEMA}.schedule SET status = %s WHERE id = %s", (body.get("status"), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.schedule ORDER BY booking_date DESC, booking_time ASC LIMIT 100")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"schedule": rows})

    # ── РАСХОДЫ ──
    if section == "expenses":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.expenses (title, amount, category, expense_date, notes)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("title",""), float(body.get("amount",0)), body.get("category","Прочее"),
                  body.get("expense_date",""), body.get("notes","")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.expenses WHERE id = %s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.expenses ORDER BY expense_date DESC, created_at DESC LIMIT 100")
        rows = [dict(r) for r in cur.fetchall()]
        cur.execute(f"SELECT COALESCE(SUM(amount),0) as v FROM {SCHEMA}.expenses"); total = float(cur.fetchone()["v"])
        cur.execute(f"SELECT COALESCE(SUM(amount),0) as v FROM {SCHEMA}.expenses WHERE expense_date >= DATE_TRUNC('month', NOW())"); month = float(cur.fetchone()["v"])
        conn.close(); return resp({"expenses": rows, "total": total, "month": month})

    # ── УВЕДОМЛЕНИЯ / SMS ──
    if section == "notifications":
        if body.get("action") == "send":
            phone = body.get("phone",""); message = body.get("message","")
            ok = send_sms(phone, message)
            cur.execute(f"INSERT INTO {SCHEMA}.notifications (client_id, client_phone, message, status, sent_at) VALUES (%s,%s,%s,%s,NOW())",
                        (body.get("client_id"), phone, message, "sent" if ok else "failed"))
            conn.commit(); conn.close(); return resp({"ok": True, "sms_sent": ok})
        if body.get("action") == "send_all":
            message = body.get("message","")
            cur.execute(f"SELECT id, phone FROM {SCHEMA}.clients")
            clients = cur.fetchall()
            count = 0
            for c in clients:
                ok = send_sms(c["phone"], message)
                cur.execute(f"INSERT INTO {SCHEMA}.notifications (client_id, client_phone, message, status, sent_at) VALUES (%s,%s,%s,%s,NOW())",
                            (c["id"], c["phone"], message, "sent" if ok else "failed"))
                if ok: count += 1
            conn.commit(); conn.close(); return resp({"ok": True, "sent": count})
        cur.execute(f"SELECT n.*, c.name as client_name FROM {SCHEMA}.notifications n LEFT JOIN {SCHEMA}.clients c ON c.id = n.client_id ORDER BY n.created_at DESC LIMIT 50")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"notifications": rows})

    # ── ГАЛЕРЕЯ ──
    if section == "gallery":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.admin_gallery (title, url, category) VALUES (%s,%s,%s) RETURNING id",
                        (body.get("title",""), body.get("url",""), body.get("category","До и после")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.admin_gallery WHERE id = %s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery ORDER BY created_at DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"gallery": rows})

    # ── КЛИЕНТЫ ──
    if section == "clients":
        cur.execute(f"""
            SELECT c.id, c.name, c.phone, c.created_at,
                   COUNT(b.id) AS bookings_count, MAX(b.created_at) AS last_booking
            FROM {SCHEMA}.clients c
            LEFT JOIN {SCHEMA}.bookings b ON b.client_id = c.id
            GROUP BY c.id ORDER BY c.created_at DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"clients": rows, "total": len(rows)})

    # ── СОТРУДНИКИ ──
    if section == "staff":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.staff (name, phone, role, pin) VALUES (%s,%s,%s,%s) RETURNING id",
                        (body.get("name",""), body.get("phone",""), body.get("role","specialist"), str(body.get("pin",""))))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"UPDATE {SCHEMA}.staff SET is_active = false WHERE id = %s AND role != 'owner'", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "reset_pin":
            new_pin = str(body.get("pin",""))
            cur.execute(f"UPDATE {SCHEMA}.staff SET pin = %s WHERE id = %s", (new_pin, body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT id, name, phone, role, is_active, created_at FROM {SCHEMA}.staff ORDER BY id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"staff": rows})

    # ── СООБЩЕНИЯ ──
    if section == "messages":
        cur.execute(f"""
            SELECT ch.id, ch.client_name, ch.client_phone, ch.created_at,
                   COUNT(cm.id) as msg_count, MAX(cm.created_at) as last_msg
            FROM {SCHEMA}.chats ch
            LEFT JOIN {SCHEMA}.chat_messages cm ON cm.chat_id = ch.id
            GROUP BY ch.id ORDER BY last_msg DESC NULLS LAST LIMIT 50
        """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"chats": rows})

    # ── ПРОФИЛЬ ВЛАДЕЛЬЦА ──
    if section == "profile":
        if body.get("action") == "save":
            fields = ["name","surname","birthdate","site_name","phone","email","specialization","about","vk_url","instagram_url","telegram_url","whatsapp_url"]
            sets = ", ".join(f"{f} = %s" for f in fields if f in body)
            vals = [body[f] for f in fields if f in body]
            if vals:
                cur.execute(f"UPDATE {SCHEMA}.owner_profile SET updated_at=NOW(), {sets} WHERE id=1", vals)
                conn.commit()
            conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.owner_profile WHERE id=1")
        row = cur.fetchone()
        conn.close(); return resp({"profile": dict(row) if row else {}})

    # ── ДОХОДЫ ──
    if section == "income":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.income (title, amount, category, income_date, notes) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                        (body.get("title",""), float(body.get("amount",0)), body.get("category","Услуги"),
                         body.get("income_date", ""), body.get("notes","")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.income WHERE id = %s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.income ORDER BY income_date DESC, created_at DESC LIMIT 100")
        rows = [dict(r) for r in cur.fetchall()]
        cur.execute(f"SELECT COALESCE(SUM(amount),0) as v FROM {SCHEMA}.income"); total = float(cur.fetchone()["v"])
        cur.execute(f"SELECT COALESCE(SUM(amount),0) as v FROM {SCHEMA}.income WHERE income_date >= DATE_TRUNC('month', NOW())"); month = float(cur.fetchone()["v"])
        conn.close(); return resp({"income": rows, "total": total, "month": month})

    # ── РАБОЧЕЕ РАСПИСАНИЕ ──
    if section == "work_schedule":
        if body.get("action") == "save":
            for day in body.get("days", []):
                cur.execute(f"""
                    UPDATE {SCHEMA}.work_schedule SET is_working=%s, time_from=%s, time_to=%s, notes=%s
                    WHERE day_of_week=%s
                """, (day.get("is_working",True), day.get("time_from","11:00"), day.get("time_to","20:00"), day.get("notes",""), day.get("day_of_week")))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.work_schedule ORDER BY day_of_week")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"days": rows})

    # ── ПАПКИ ГАЛЕРЕИ ──
    if section == "gallery_folders":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.gallery_folders (name, description, cover_url, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                        (body.get("name",""), body.get("description",""), body.get("cover_url",""), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(f"UPDATE {SCHEMA}.gallery_folders SET name=%s, description=%s, cover_url=%s WHERE id=%s",
                        (body.get("name",""), body.get("description",""), body.get("cover_url",""), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "deactivate":
            cur.execute(f"UPDATE {SCHEMA}.gallery_folders SET sort_order=-1 WHERE id=%s AND id NOT IN (SELECT id FROM {SCHEMA}.gallery_folders WHERE sort_order=-1)", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.gallery_folders WHERE sort_order >= 0 ORDER BY sort_order, id")
        folders = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"folders": folders})

    # ── ГАЛЕРЕЯ (с папками) ──
    if section == "gallery":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.admin_gallery (title, url, category, folder_id) VALUES (%s,%s,%s,%s) RETURNING id",
                        (body.get("title",""), body.get("url",""), body.get("category",""), body.get("folder_id")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "deactivate":
            cur.execute(f"UPDATE {SCHEMA}.admin_gallery SET category='archived' WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        folder_id = body.get("folder_id")
        if folder_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery WHERE folder_id=%s AND category!='archived' ORDER BY created_at DESC", (folder_id,))
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery WHERE category!='archived' ORDER BY created_at DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"gallery": rows})

    # ── ПРАЙС-ЛИСТ КАСТОМНЫЙ ──
    if section == "pricelist_custom":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.pricelist_custom (name, category, price, duration, description, photo_url, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("name",""), body.get("category",""), body.get("price",""), body.get("duration",""),
                  body.get("description",""), body.get("photo_url",""), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(f"""
                UPDATE {SCHEMA}.pricelist_custom
                SET name=%s, category=%s, price=%s, duration=%s, description=%s, photo_url=%s
                WHERE id=%s
            """, (body.get("name",""), body.get("category",""), body.get("price",""), body.get("duration",""),
                  body.get("description",""), body.get("photo_url",""), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.pricelist_custom SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "deactivate":
            cur.execute(f"UPDATE {SCHEMA}.pricelist_custom SET is_active=false WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        if active_only:
            cur.execute(f"SELECT * FROM {SCHEMA}.pricelist_custom WHERE is_active=true ORDER BY category, sort_order, id")
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.pricelist_custom ORDER BY category, sort_order, id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"items": rows})

    # ── РАССЫЛКА ──
    if section == "broadcast":
        message = body.get("message","")
        channels = body.get("channels", [])
        sent_count = 0
        if "sms" in channels:
            cur.execute(f"SELECT id, phone FROM {SCHEMA}.clients")
            clients = cur.fetchall()
            for c in clients:
                if send_sms(c["phone"], message):
                    sent_count += 1
        # Для чата — вставляем сообщение в каждый чат как "системное"
        if "chat" in channels:
            cur.execute(f"SELECT id FROM {SCHEMA}.chats")
            chats = cur.fetchall()
            for ch in chats:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chat_messages (chat_id, sender, content, message_type)
                    VALUES (%s, 'admin', %s, 'text')
                """, (ch["id"], message))
            sent_count += len(chats)
        cur.execute(f"INSERT INTO {SCHEMA}.broadcast_log (message, channels, sent_count) VALUES (%s,%s,%s)",
                    (message, ",".join(channels), sent_count))
        conn.commit(); conn.close(); return resp({"ok": True, "sent": sent_count})

    # ── ФИНАНСЫ ПО МЕСЯЦАМ ──
    if section == "monthly_finance":
        # Пересчитываем и сохраняем текущий месяц
        if body.get("action") == "recalc":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.monthly_finance (year, month, total_income, total_expenses, profit)
                SELECT EXTRACT(YEAR FROM income_date)::int, EXTRACT(MONTH FROM income_date)::int,
                       COALESCE(SUM(amount),0), 0, COALESCE(SUM(amount),0)
                FROM {SCHEMA}.income
                WHERE income_date IS NOT NULL AND income_date != ''
                GROUP BY EXTRACT(YEAR FROM income_date), EXTRACT(MONTH FROM income_date)
                ON CONFLICT (year, month) DO UPDATE SET
                  total_income = EXCLUDED.total_income,
                  updated_at = NOW()
            """)
            cur.execute(f"""
                UPDATE {SCHEMA}.monthly_finance mf SET
                  total_expenses = sub.exp,
                  profit = mf.total_income - sub.exp,
                  updated_at = NOW()
                FROM (
                  SELECT EXTRACT(YEAR FROM expense_date::date)::int as yr,
                         EXTRACT(MONTH FROM expense_date::date)::int as mo,
                         COALESCE(SUM(amount),0) as exp
                  FROM {SCHEMA}.expenses
                  WHERE expense_date IS NOT NULL AND expense_date != ''
                  GROUP BY yr, mo
                ) sub
                WHERE mf.year = sub.yr AND mf.month = sub.mo
            """)
            conn.commit()
        cur.execute(f"SELECT * FROM {SCHEMA}.monthly_finance ORDER BY year DESC, month DESC LIMIT 24")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"months": rows})

    # ── МАСТЕРА ──
    if section == "masters":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.masters_custom (name, spec, rating, reviews_count, photo_url, tags, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("name",""), body.get("spec",""), float(body.get("rating",5.0)),
                  int(body.get("reviews_count",0)), body.get("photo_url",""), body.get("tags",""), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(f"""
                UPDATE {SCHEMA}.masters_custom
                SET name=%s, spec=%s, rating=%s, reviews_count=%s, photo_url=%s, tags=%s
                WHERE id=%s
            """, (body.get("name",""), body.get("spec",""), float(body.get("rating",5.0)),
                  int(body.get("reviews_count",0)), body.get("photo_url",""), body.get("tags",""), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.masters_custom SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        if active_only:
            cur.execute(f"SELECT * FROM {SCHEMA}.masters_custom WHERE is_active=true ORDER BY sort_order, id")
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.masters_custom ORDER BY sort_order, id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"masters": rows})

    conn.close()
    return resp({"error": "Unknown section"}, 400)