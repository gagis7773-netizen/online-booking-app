"""
API интернет-магазина Girly Paradise.
Разделы: categories, products, orders, cart-checkout
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


def send_sms(phone: str, message: str) -> bool:
    api_id = os.environ.get("SMSRU_API_ID", "")
    if not api_id or not phone:
        return False
    clean = "".join(c for c in phone if c.isdigit())
    if clean.startswith("8"):
        clean = "7" + clean[1:]
    if len(clean) < 10:
        return False
    params = urllib.parse.urlencode({"api_id": api_id, "to": clean, "msg": message, "json": 1})
    try:
        urllib.request.urlopen(f"https://sms.ru/sms/send?{params}", timeout=10)
        return True
    except Exception:
        return False


def handler(event: dict, context) -> dict:
    """API интернет-магазина: категории, товары, заказы."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    section = body.get("section", "")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── КАТЕГОРИИ ──
    if section == "categories":
        if body.get("action") == "add":
            cur.execute(
                f"INSERT INTO {SCHEMA}.shop_categories (name, description, sort_order) VALUES (%s,%s,%s) RETURNING id",
                (body.get("name", ""), body.get("description", ""), int(body.get("sort_order", 0)))
            )
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(
                f"UPDATE {SCHEMA}.shop_categories SET name=%s, description=%s, sort_order=%s WHERE id=%s",
                (body.get("name", ""), body.get("description", ""), int(body.get("sort_order", 0)), body.get("id"))
            )
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "delete":
            cur.execute(f"UPDATE {SCHEMA}.shop_categories SET is_active=false WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        active_only = body.get("active_only", False)
        if active_only:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_categories WHERE is_active=true ORDER BY sort_order, id")
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_categories ORDER BY sort_order, id")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"categories": rows})

    # ── ТОВАРЫ ──
    if section == "products":
        if body.get("action") == "add":
            cur.execute(
                f"""INSERT INTO {SCHEMA}.shop_products
                    (category_id, name, description, price, photo_url, stock, sort_order)
                    VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("category_id"), body.get("name", ""), body.get("description", ""),
                 float(body.get("price", 0)), body.get("photo_url", ""),
                 int(body.get("stock", 0)), int(body.get("sort_order", 0)))
            )
            row_id = cur.fetchone()["id"]
            conn.commit(); conn.close(); return resp({"ok": True, "id": row_id})
        if body.get("action") == "update":
            cur.execute(
                f"""UPDATE {SCHEMA}.shop_products
                    SET category_id=%s, name=%s, description=%s, price=%s, photo_url=%s, stock=%s, sort_order=%s
                    WHERE id=%s""",
                (body.get("category_id"), body.get("name", ""), body.get("description", ""),
                 float(body.get("price", 0)), body.get("photo_url", ""),
                 int(body.get("stock", 0)), int(body.get("sort_order", 0)), body.get("id"))
            )
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "toggle":
            cur.execute(f"UPDATE {SCHEMA}.shop_products SET is_active = NOT is_active WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        if body.get("action") == "delete":
            cur.execute(f"UPDATE {SCHEMA}.shop_products SET is_active=false WHERE id=%s", (body.get("id"),))
            conn.commit(); conn.close(); return resp({"ok": True})
        category_id = body.get("category_id")
        active_only = body.get("active_only", False)
        if category_id:
            sql = f"SELECT p.*, c.name as category_name FROM {SCHEMA}.shop_products p LEFT JOIN {SCHEMA}.shop_categories c ON c.id=p.category_id WHERE p.category_id=%s"
            params = [category_id]
        else:
            sql = f"SELECT p.*, c.name as category_name FROM {SCHEMA}.shop_products p LEFT JOIN {SCHEMA}.shop_categories c ON c.id=p.category_id"
            params = []
        if active_only:
            sql += (" AND" if category_id else " WHERE") + " p.is_active=true"
        sql += " ORDER BY p.sort_order, p.id"
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"products": rows})

    # ── ЗАКАЗЫ ──
    if section == "orders":
        if body.get("action") == "create":
            items = body.get("items", [])
            total = sum(float(it.get("price", 0)) * int(it.get("quantity", 1)) for it in items)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.shop_orders
                    (client_id, client_name, client_phone, delivery_type, delivery_address, pickup_point, total_amount, comment)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("client_id"), body.get("client_name", ""), body.get("client_phone", ""),
                 body.get("delivery_type", "sdek"), body.get("delivery_address", ""),
                 body.get("pickup_point", ""), total, body.get("comment", ""))
            )
            order_id = cur.fetchone()["id"]
            for it in items:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.shop_order_items (order_id, product_id, product_name, price, quantity) VALUES (%s,%s,%s,%s,%s)",
                    (order_id, it.get("product_id"), it.get("name", ""), float(it.get("price", 0)), int(it.get("quantity", 1)))
                )
            conn.commit()
            # SMS клиенту
            phone = body.get("client_phone", "")
            if phone:
                send_sms(phone, f"Girly Paradise: ваш заказ №{order_id} оформлен! Сумма: {total:.0f} ₽. Мы свяжемся с вами для подтверждения. 🌸")
            # SMS владельцу
            send_sms("79046015556", f"Girly Paradise: новый заказ №{order_id} от {body.get('client_name','')}! Сумма: {total:.0f} ₽. {body.get('delivery_type','')}: {body.get('pickup_point','')}")
            conn.close(); return resp({"ok": True, "order_id": order_id, "total": total})

        if body.get("action") == "update_status":
            cur.execute(f"UPDATE {SCHEMA}.shop_orders SET status=%s WHERE id=%s", (body.get("status"), body.get("id")))
            conn.commit(); conn.close(); return resp({"ok": True})

        # Список заказов (для админа)
        status_filter = body.get("status")
        if status_filter:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_orders WHERE status=%s ORDER BY created_at DESC LIMIT 100", (status_filter,))
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_orders ORDER BY created_at DESC LIMIT 100")
        orders = [dict(r) for r in cur.fetchall()]
        # Для каждого заказа загружаем позиции
        for o in orders:
            cur.execute(f"SELECT * FROM {SCHEMA}.shop_order_items WHERE order_id=%s", (o["id"],))
            o["items"] = [dict(r) for r in cur.fetchall()]
        conn.close(); return resp({"orders": orders})

    conn.close()
    return resp({"error": "Unknown section"}, 400)
