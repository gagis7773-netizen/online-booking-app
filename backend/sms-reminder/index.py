"""
Автоматические SMS-напоминания клиентам за день до записи.
Работает через вызов admin-api (там уже есть psycopg2).
Запускается крон-задачей ежедневно в 10:00.
"""
import json
import os
import urllib.request
import urllib.parse
import datetime

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

ADMIN_API_URL = "https://functions.poehali.dev/6a39495b-54c8-4d05-a0e8-81e258a80299"


def admin_post(section: str, extra: dict = {}) -> dict:
    data = json.dumps({"section": section, **extra}).encode()
    req = urllib.request.Request(
        ADMIN_API_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


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
    """Отправляет SMS-напоминания клиентам, записанным на завтра."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    try:
        sched_data = admin_post("schedule_reminders", {"date": tomorrow})
        bookings = sched_data.get("bookings", [])
        salon_address = sched_data.get("salon_address", "ул. Заречная, 10, м. Парнас")
        template = sched_data.get("template",
            "Girly Paradise: напоминаем, вы записаны завтра на {service} в {time}. "
            "Адрес: {address}. Ждём вас! 🌸"
        )
    except Exception as e:
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"ok": False, "error": str(e)})}

    sent = 0
    skipped = 0
    sent_ids = []

    for b in bookings:
        phone = b.get("client_phone", "")
        if not phone:
            skipped += 1
            continue
        message = (
            template
            .replace("{service}", b.get("services") or "процедура")
            .replace("{time}", b.get("booking_time") or "")
            .replace("{day}", tomorrow)
            .replace("{address}", salon_address)
            .replace("{name}", b.get("client_name") or "")
        )
        if send_sms(phone, message):
            sent += 1
            sent_ids.append(b["id"])
        else:
            skipped += 1

    if sent_ids:
        try:
            admin_post("mark_reminders_sent", {"ids": sent_ids})
        except Exception:
            pass

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "sent": sent, "skipped": skipped, "date": tomorrow}, ensure_ascii=False),
    }
