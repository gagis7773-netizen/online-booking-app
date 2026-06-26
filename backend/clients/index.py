"""
Клиентская база — только для администратора салона. v2
GET / — список всех клиентов с их записями
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT
            c.id,
            c.name,
            c.phone,
            c.created_at,
            COUNT(b.id) AS bookings_count,
            MAX(b.created_at) AS last_booking
        FROM {SCHEMA}.clients c
        LEFT JOIN {SCHEMA}.bookings b ON b.client_id = c.id
        GROUP BY c.id, c.name, c.phone, c.created_at
        ORDER BY c.created_at DESC
    """)
    rows = cur.fetchall()

    clients = []
    for r in rows:
        clients.append({
            "id": r[0],
            "name": r[1],
            "phone": r[2],
            "registered_at": str(r[3])[:10] if r[3] else "",
            "bookings_count": r[4],
            "last_booking": str(r[5])[:10] if r[5] else "",
        })

    conn.close()
    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({"clients": clients, "total": len(clients)}, ensure_ascii=False)
    }