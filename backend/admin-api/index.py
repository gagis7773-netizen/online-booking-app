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
                (client_name, client_phone, services, master, booking_date, booking_time, status, notes, duration)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("client_name",""), body.get("client_phone",""), body.get("services",""),
                  body.get("master","Галина"), body.get("booking_date",""), body.get("booking_time",""),
                  body.get("status","confirmed"), body.get("notes",""), body.get("duration","")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close()
            return resp({"ok": True, "id": row_id})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.schedule WHERE id = %s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "update_status":
            cur.execute(f"UPDATE {SCHEMA}.schedule SET status = %s WHERE id = %s", (body.get("status"), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        # Клиент отменяет свою запись (по phone + id)
        if body.get("action") == "client_cancel":
            phone = body.get("client_phone", "")
            booking_id = body.get("booking_id")
            cur.execute(f"""
                UPDATE {SCHEMA}.schedule SET status='cancelled'
                WHERE id=%s AND client_phone=%s AND status != 'cancelled'
            """, (booking_id, phone))
            cur.execute(f"""
                UPDATE {SCHEMA}.bookings SET status='cancelled'
                WHERE id=%s AND client_phone=%s
            """, (booking_id, phone))
            conn.commit(); conn.close(); return resp({"ok": True})
        # Клиент переносит запись (по phone + id)
        if body.get("action") == "client_reschedule":
            phone = body.get("client_phone", "")
            booking_id = body.get("booking_id")
            new_date = body.get("new_date", "")
            new_time = body.get("new_time", "")
            cur.execute(f"""
                UPDATE {SCHEMA}.schedule
                SET booking_date=%s, booking_time=%s, status='confirmed'
                WHERE id=%s AND client_phone=%s
            """, (new_date, new_time, booking_id, phone))
            cur.execute(f"""
                UPDATE {SCHEMA}.bookings
                SET booking_date=%s, booking_time=%s, status='rescheduled'
                WHERE id=%s AND client_phone=%s
            """, (new_date, new_time, booking_id, phone))
            conn.commit(); conn.close(); return resp({"ok": True})
        # Получить записи клиента по телефону
        if body.get("action") == "by_phone":
            phone = body.get("client_phone", "")
            cur.execute(f"""
                SELECT id, client_name, services, master, booking_date, booking_time, status, notes, duration
                FROM {SCHEMA}.schedule
                WHERE client_phone=%s AND booking_date >= CURRENT_DATE::text
                ORDER BY booking_date ASC, booking_time ASC
            """, (phone,))
            rows = [dict(r) for r in cur.fetchall()]
            conn.close(); return resp({"bookings": rows})
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
        if body.get("action") == "update_discount":
            cur.execute(f"UPDATE {SCHEMA}.clients SET discount_percent=%s WHERE id=%s",
                        (int(body.get("discount_percent", 0)), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        filter_type = body.get("filter", "all")
        # Проверяем чёрный список
        bl_ids = set()
        cur.execute(f"SELECT client_id FROM {SCHEMA}.blacklist WHERE client_id IS NOT NULL")
        for row in cur.fetchall():
            if row["client_id"]: bl_ids.add(row["client_id"])
        cur.execute(f"""
            SELECT c.id, c.name, c.phone, c.created_at, c.birthdate, c.discount_percent,
                   COUNT(b.id) AS bookings_count, MAX(b.created_at) AS last_booking
            FROM {SCHEMA}.clients c
            LEFT JOIN {SCHEMA}.bookings b ON b.client_id = c.id
            GROUP BY c.id ORDER BY c.created_at DESC
        """)
        all_clients = [dict(r) for r in cur.fetchall()]
        if filter_type == "blacklist":
            rows = [c for c in all_clients if c["id"] in bl_ids]
        elif filter_type == "dormant":
            # Спящие — не было записей больше 60 дней или вообще нет
            import datetime
            threshold = datetime.datetime.now() - datetime.timedelta(days=60)
            rows = [c for c in all_clients
                    if c["id"] not in bl_ids and (not c["last_booking"] or c["last_booking"] < threshold)]
        elif filter_type == "active":
            import datetime
            threshold = datetime.datetime.now() - datetime.timedelta(days=60)
            rows = [c for c in all_clients
                    if c["id"] not in bl_ids and c["last_booking"] and c["last_booking"] >= threshold]
        else:
            rows = [c for c in all_clients if c["id"] not in bl_ids]
        conn.close(); return resp({"clients": rows, "total": len(rows), "blacklist_ids": list(bl_ids)})

    # ── ЧЁРНЫЙ СПИСОК ──
    if section == "blacklist":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.blacklist (client_id, phone, name, reason)
                VALUES (%s,%s,%s,%s) RETURNING id
            """, (body.get("client_id"), body.get("phone",""), body.get("name",""), body.get("reason","")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "remove":
            cur.execute(f"UPDATE {SCHEMA}.blacklist SET client_id=NULL WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.blacklist ORDER BY created_at DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"blacklist": rows})

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
        if body.get("action") == "delete":
            folder_id = body.get("id")
            # Архивируем все фото папки
            cur.execute(f"UPDATE {SCHEMA}.admin_gallery SET category='archived' WHERE folder_id=%s", (folder_id,))
            # Скрываем папку (soft delete через sort_order=-2)
            cur.execute(f"UPDATE {SCHEMA}.gallery_folders SET sort_order=-2 WHERE id=%s", (folder_id,))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.gallery_folders WHERE sort_order >= 0 ORDER BY sort_order, id")
        folders = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"folders": folders})

    # ── ГАЛЕРЕЯ (с папками) ──
    if section == "gallery":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.admin_gallery (title, url, category, folder_id, display_size) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                        (body.get("title",""), body.get("url",""), body.get("category",""), body.get("folder_id"), body.get("display_size","medium")))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update_size":
            cur.execute(f"UPDATE {SCHEMA}.admin_gallery SET display_size=%s WHERE id=%s", (body.get("display_size","medium"), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "deactivate":
            cur.execute(f"UPDATE {SCHEMA}.admin_gallery SET category='archived' WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        folder_id = body.get("folder_id")
        if folder_id:
            # Строго только фото этой папки — никаких чужих
            cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery WHERE folder_id=%s AND category!='archived' ORDER BY created_at DESC", (folder_id,))
        elif body.get("all"):
            # Все фото (для админа без фильтра)
            cur.execute(f"SELECT * FROM {SCHEMA}.admin_gallery WHERE category!='archived' ORDER BY created_at DESC")
        else:
            # Без folder_id — возвращаем пустой список (не смешиваем папки)
            conn.close(); return resp({"gallery": []})
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

    # ── ДОКУМЕНТЫ И СЕРТИФИКАТЫ ──
    if section == "documents":
        if body.get("action") == "add":
            cur.execute(f"""
                INSERT INTO {SCHEMA}.documents (title, description, file_url, doc_type, sort_order)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (body.get("title",""), body.get("description",""), body.get("file_url",""),
                  body.get("doc_type","certificate"), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.documents SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        if active_only:
            cur.execute(f"SELECT * FROM {SCHEMA}.documents WHERE is_active=true ORDER BY sort_order, id")
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.documents ORDER BY sort_order, id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"documents": rows})

    # ── УВЕДОМЛЕНИЕ ВЛАДЕЛЬЦУ ──
    if section == "notify_owner":
        event_type = body.get("event_type", "")
        message = body.get("message", "")
        api_id = os.environ.get("SMSRU_API_ID", "")
        owner_phone = "79046015556"
        sent = False
        if api_id and owner_phone:
            sent = send_sms(owner_phone, message)
        conn.close()
        return resp({"ok": True, "sent": sent})

    # ── НАСТРОЙКИ САЙТА ──
    if section == "site_settings":
        if body.get("action") == "save":
            for key, value in body.get("settings", {}).items():
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.site_settings (key, value, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """, (key, str(value)))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT key, value FROM {SCHEMA}.site_settings")
        result = {r["key"]: r["value"] for r in cur.fetchall()}
        conn.close(); return resp({"settings": result})

    # ── ШАБЛОНЫ УВЕДОМЛЕНИЙ ──
    if section == "notification_templates":
        if body.get("action") == "save":
            cur.execute(f"""
                UPDATE {SCHEMA}.notification_templates
                SET body=%s, title=%s, updated_at=NOW()
                WHERE template_key=%s
            """, (body.get("body",""), body.get("title",""), body.get("template_key","")))
            conn.commit(); conn.close(); return resp({"ok": True})
        cur.execute(f"SELECT * FROM {SCHEMA}.notification_templates ORDER BY id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"templates": rows})

    # ── SMS НАПОМИНАНИЯ: записи на дату ──
    if section == "schedule_reminders":
        date = body.get("date", "")
        cur.execute(f"""
            SELECT id, client_name, client_phone, services, booking_time
            FROM {SCHEMA}.schedule
            WHERE booking_date = %s AND (reminder_sent IS NULL OR reminder_sent = false)
        """, (date,))
        bookings = [dict(r) for r in cur.fetchall()]
        # Адрес салона
        cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key='salon_address' LIMIT 1")
        addr_row = cur.fetchone()
        salon_address = addr_row["value"] if addr_row else "ул. Заречная, 10, м. Парнас"
        # Шаблон
        cur.execute(f"SELECT body FROM {SCHEMA}.notification_templates WHERE template_key='booking_reminder' LIMIT 1")
        tmpl_row = cur.fetchone()
        template = tmpl_row["body"] if tmpl_row else "Girly Paradise: напоминаем, вы записаны завтра на {service} в {time}. Адрес: {address}. Ждём вас! 🌸"
        conn.close()
        return resp({"bookings": bookings, "salon_address": salon_address, "template": template})

    # ── ПОМЕТИТЬ НАПОМИНАНИЯ КАК ОТПРАВЛЕННЫЕ ──
    if section == "mark_reminders_sent":
        ids = body.get("ids", [])
        if ids:
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"UPDATE {SCHEMA}.schedule SET reminder_sent=true WHERE id IN ({placeholders})", ids)
            conn.commit()
        conn.close(); return resp({"ok": True})

    # ── ШОП: КАТЕГОРИИ ──
    if section == "shop_categories":
        if body.get("action") == "add":
            cur.execute(f"INSERT INTO {SCHEMA}.shop_categories (name, description, sort_order) VALUES (%s,%s,%s) RETURNING id",
                        (body.get("name",""), body.get("description",""), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]; conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(f"UPDATE {SCHEMA}.shop_categories SET name=%s, description=%s, sort_order=%s WHERE id=%s",
                        (body.get("name",""), body.get("description",""), int(body.get("sort_order",0)), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "delete":
            cur.execute(f"UPDATE {SCHEMA}.shop_categories SET is_active=false WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        q = f"SELECT * FROM {SCHEMA}.shop_categories" + (" WHERE is_active=true" if active_only else "") + " ORDER BY sort_order, id"
        cur.execute(q); rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"categories": rows})

    # ── ШОП: ТОВАРЫ ──
    if section == "shop_products":
        if body.get("action") == "add":
            cur.execute(f"""INSERT INTO {SCHEMA}.shop_products (category_id, name, description, price, photo_url, stock, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("category_id"), body.get("name",""), body.get("description",""),
                 float(body.get("price",0)), body.get("photo_url",""), int(body.get("stock",0)), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]; conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(f"""UPDATE {SCHEMA}.shop_products SET category_id=%s, name=%s, description=%s,
                price=%s, photo_url=%s, stock=%s, sort_order=%s WHERE id=%s""",
                (body.get("category_id"), body.get("name",""), body.get("description",""),
                 float(body.get("price",0)), body.get("photo_url",""), int(body.get("stock",0)),
                 int(body.get("sort_order",0)), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.shop_products SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "delete":
            cur.execute(f"UPDATE {SCHEMA}.shop_products SET is_active=false WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        cat_id = body.get("category_id")
        active_only = body.get("active_only", False)
        sql = f"SELECT p.*, c.name as category_name FROM {SCHEMA}.shop_products p LEFT JOIN {SCHEMA}.shop_categories c ON c.id=p.category_id"
        params = []
        conditions = []
        if cat_id: conditions.append("p.category_id=%s"); params.append(cat_id)
        if active_only: conditions.append("p.is_active=true")
        if conditions: sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY p.sort_order, p.id"
        cur.execute(sql, params); rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"products": rows})

    # ── ШОП: ЗАКАЗЫ ──
    if section == "shop_orders":
        if body.get("action") == "create":
            items = body.get("items", [])
            total = sum(float(it.get("price",0)) * int(it.get("quantity",1)) for it in items)
            payment_method = body.get("payment_method", "on_delivery")
            cur.execute(f"""INSERT INTO {SCHEMA}.shop_orders
                (client_id, client_name, client_phone, delivery_type, delivery_address, pickup_point, total_amount, comment, payment_method, payment_status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("client_id"), body.get("client_name",""), body.get("client_phone",""),
                 body.get("delivery_type","sdek"), body.get("delivery_address",""),
                 body.get("pickup_point",""), total, body.get("comment",""),
                 payment_method, "waiting" if payment_method == "card" else "pending"))
            order_id = cur.fetchone()["id"]
            for it in items:
                cur.execute(f"INSERT INTO {SCHEMA}.shop_order_items (order_id, product_id, product_name, price, quantity) VALUES (%s,%s,%s,%s,%s)",
                            (order_id, it.get("product_id"), it.get("name",""), float(it.get("price",0)), int(it.get("quantity",1))))
            conn.commit()
            phone = body.get("client_phone","")
            pay_note = "Оплата при получении" if payment_method == "on_delivery" else "Оплата картой/СБП"
            if phone: send_sms(phone, f"Girly Paradise: заказ №{order_id} оформлен! Сумма: {total:.0f} ₽. {pay_note}. Свяжемся с вами. 🌸")
            send_sms("79046015556", f"Girly Paradise: новый заказ №{order_id} от {body.get('client_name','')}! {total:.0f} ₽. {pay_note}. {body.get('delivery_type','')}: {body.get('pickup_point','')}")
            # Возвращаем реквизиты оплаты если выбрана карта
            payment_info = {}
            if payment_method == "card":
                cur.execute(f"SELECT key, value FROM {SCHEMA}.site_settings WHERE key IN ('payment_card_number','payment_phone_sbp','payment_bank_name','payment_recipient_name')")
                payment_info = {r["key"]: r["value"] for r in cur.fetchall()}
            conn.close(); return resp({"ok": True, "order_id": order_id, "total": total, "payment_info": payment_info})
        if body.get("action") == "update_status":
            status = body.get("status")
            order_id = body.get("id")
            extra_fields = ""
            extra_vals = []
            if status == "shipped":
                extra_fields = ", shipped_at=NOW()"
                # Отправить SMS клиенту при отправке
                tracking_number = body.get("tracking_number", "")
                tracking_url = body.get("tracking_url", "")
                if tracking_number:
                    extra_fields += ", tracking_number=%s"
                    extra_vals.append(tracking_number)
                if tracking_url:
                    extra_fields += ", tracking_url=%s"
                    extra_vals.append(tracking_url)
                # SMS клиенту
                cur.execute(f"SELECT client_phone, client_name FROM {SCHEMA}.shop_orders WHERE id=%s", (order_id,))
                row = cur.fetchone()
                if row and row["client_phone"]:
                    track_info = f" Трек: {tracking_number}" if tracking_number else ""
                    track_link = f" {tracking_url}" if tracking_url else ""
                    send_sms(row["client_phone"], f"Girly Paradise: ваш заказ №{order_id} отправлен! 🚚{track_info}{track_link} Ожидайте доставку.")
            elif status == "cancelled":
                extra_fields = ", cancelled_at=NOW()"
                cur.execute(f"SELECT client_phone FROM {SCHEMA}.shop_orders WHERE id=%s", (order_id,))
                row = cur.fetchone()
                if row and row["client_phone"]:
                    send_sms(row["client_phone"], f"Girly Paradise: заказ №{order_id} отменён. Если есть вопросы — позвоните нам.")
            elif status == "confirmed":
                cur.execute(f"SELECT client_phone FROM {SCHEMA}.shop_orders WHERE id=%s", (order_id,))
                row = cur.fetchone()
                if row and row["client_phone"]:
                    send_sms(row["client_phone"], f"Girly Paradise: заказ №{order_id} подтверждён! ✅ Скоро приступим к сборке и отправке.")
            cur.execute(f"UPDATE {SCHEMA}.shop_orders SET status=%s{extra_fields} WHERE id=%s",
                        [status] + extra_vals + [order_id])
            conn.commit(); conn.close(); return resp({"ok": True})

        if body.get("action") == "hide":
            cur.execute(f"UPDATE {SCHEMA}.shop_orders SET is_hidden=true WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})

        if body.get("action") == "client_orders":
            client_id = body.get("client_id")
            if not client_id:
                conn.close(); return resp({"orders": []})
            cur.execute(f"""
                SELECT * FROM {SCHEMA}.shop_orders
                WHERE client_id=%s AND (is_hidden IS NULL OR is_hidden=false)
                ORDER BY created_at DESC LIMIT 50
            """, (client_id,))
            orders = [dict(r) for r in cur.fetchall()]
            for o in orders:
                cur.execute(f"SELECT * FROM {SCHEMA}.shop_order_items WHERE order_id=%s", (o["id"],))
                o["items"] = [dict(r) for r in cur.fetchall()]
            conn.close(); return resp({"orders": orders})

        status_filter = body.get("status")
        show_hidden = body.get("show_hidden", False)
        if status_filter:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_orders WHERE status=%s AND (is_hidden IS NULL OR is_hidden=false) ORDER BY created_at DESC LIMIT 100", (status_filter,))
        else:
            hidden_clause = "" if show_hidden else "WHERE (is_hidden IS NULL OR is_hidden=false)"
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_orders {hidden_clause} ORDER BY created_at DESC LIMIT 100")
        orders = [dict(r) for r in cur.fetchall()]
        for o in orders:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_order_items WHERE order_id=%s", (o["id"],))
            o["items"] = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"orders": orders})

    # ── СЧЁТЧИКИ БЕЙДЖЕЙ (сообщения + заказы + новые записи) ──
    if section == "badge_counts":
        if body.get("action") == "mark_bookings_seen":
            cur.execute(f"UPDATE {SCHEMA}.schedule SET is_seen = true WHERE is_seen = false")
            conn.commit(); conn.close(); return resp({"ok": True})
        # Непрочитанные сообщения
        try:
            cur.execute(f"""
                SELECT COUNT(DISTINCT c.id) as unread_msgs
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.messages m ON m.chat_id = c.id
                WHERE m.sender = 'client'
                  AND (c.admin_read_at IS NULL OR m.created_at > c.admin_read_at)
                  AND m.created_at > NOW() - INTERVAL '7 days'
            """)
            unread_msgs = int(cur.fetchone()["unread_msgs"] or 0)
        except Exception:
            unread_msgs = 0
        # Новые заказы
        try:
            cur.execute(f"SELECT COUNT(*) as cnt FROM {SCHEMA}.shop_orders WHERE status='new'")
            new_orders = int(cur.fetchone()["cnt"] or 0)
        except Exception:
            new_orders = 0
        # Новые записи (не просмотренные)
        try:
            cur.execute(f"SELECT COUNT(*) as cnt FROM {SCHEMA}.schedule WHERE is_seen = false")
            new_bookings = int(cur.fetchone()["cnt"] or 0)
        except Exception:
            new_bookings = 0
        conn.close(); return resp({"unread_msgs": unread_msgs, "new_orders": new_orders, "new_bookings": new_bookings})

    # ── БАННЕРЫ/РЕКЛАМА МАГАЗИНА ──
    if section == "shop_banners":
        if body.get("action") == "add":
            cur.execute(f"""INSERT INTO {SCHEMA}.shop_banners (title, subtitle, image_url, link_url, sort_order)
                VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("title",""), body.get("subtitle",""), body.get("image_url",""),
                 body.get("link_url",""), int(body.get("sort_order",0))))
            row_id = cur.fetchone()["id"]; conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.shop_banners SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "delete":
            cur.execute(f"DELETE FROM {SCHEMA}.shop_banners WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        q = f"SELECT * FROM {SCHEMA}.shop_banners" + (" WHERE is_active=true" if active_only else "") + " ORDER BY sort_order, id"
        cur.execute(q); rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"banners": rows})

    conn.close()
    return resp({"error": "Unknown section"}, 400)