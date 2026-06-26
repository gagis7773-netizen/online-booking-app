import json
import os
import smtplib
import psycopg2
# v4
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SCHEMA = "t_p3248579_online_booking_app"


def send_email(server, smtp_user, to_email, subject, html_body):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    server.sendmail(smtp_user, to_email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Отправляет уведомление владельцу и подтверждение клиенту о новой записи."""

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    name = body.get("name", "")
    phone = body.get("phone", "")
    client_email = body.get("email", "")
    service = body.get("service", "")
    master = body.get("master", "Любой свободный")
    day = body.get("day", "")
    time = body.get("time", "")
    price = body.get("price", "")

    smtp_user = "Siplatova777@list.ru"
    smtp_password = os.environ["SMTP_PASSWORD"]
    owner_email = "Siplatova777@list.ru"

    owner_logo = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/91d2850b-d07b-4736-9ab4-23d3cca534fa.png"

    # Письмо владельцу
    owner_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f19; color: #ffffff; padding: 32px; border-radius: 16px;">
        <div style="background: linear-gradient(135deg, hsl(315,100%,55%), hsl(270,100%,60%)); padding: 2px; border-radius: 14px; margin-bottom: 24px;">
            <div style="background: #0f0f19; border-radius: 12px; padding: 24px; text-align: center;">
                <img src="{owner_logo}" alt="Girly Paradise" style="width: 80px; height: 80px; object-fit: contain; background: white; border-radius: 12px; padding: 6px; margin-bottom: 10px;" />
                <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Новая запись!</h1>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Клиент</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{name}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Телефон</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;"><a href="tel:{phone}" style="color: hsl(315,100%,65%); text-decoration: none;">{phone}</a></td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Email</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{client_email or "—"}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Услуга</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{service}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Мастер</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{master}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Дата и время</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{day} в {time}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Стоимость</td><td style="padding: 10px 0; font-weight: 700; text-align: right; color: hsl(315,100%,65%); font-size: 18px;">{price} ₽</td></tr>
        </table>
        <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.04); border-radius: 10px; font-size: 12px; color: #555; text-align: center;">
            Уведомление отправлено автоматически с сайта записи
        </div>
    </div>
    """

    logo_url = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/91d2850b-d07b-4736-9ab4-23d3cca534fa.png"

    # Письмо клиенту
    client_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f19; color: #ffffff; padding: 32px; border-radius: 16px;">
        <div style="background: linear-gradient(135deg, hsl(315,100%,55%), hsl(270,100%,60%)); padding: 2px; border-radius: 14px; margin-bottom: 24px;">
            <div style="background: #0f0f19; border-radius: 12px; padding: 24px; text-align: center;">
                <img src="{logo_url}" alt="Girly Paradise" style="width: 100px; height: 100px; object-fit: contain; background: white; border-radius: 16px; padding: 8px; margin-bottom: 12px;" />
                <p style="margin: 6px 0 0; color: hsl(315,100%,65%); font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Beauty Apartments</p>
                <div style="margin-top: 16px; border-top: 1px solid #222; padding-top: 16px;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">Запись подтверждена!</p>
                    <p style="margin: 6px 0 0; color: #888; font-size: 14px;">Привет, {name}! Ждём тебя 💅</p>
                </div>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Услуга</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{service}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Мастер</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{master}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px; border-bottom: 1px solid #222;">Дата и время</td><td style="padding: 10px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #222;">{day} в {time}</td></tr>
            <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Стоимость</td><td style="padding: 10px 0; font-weight: 700; text-align: right; color: hsl(315,100%,65%); font-size: 18px;">{price} ₽</td></tr>
        </table>
        <div style="margin-top: 24px; padding: 20px; background: rgba(255,80,180,0.08); border: 1px solid rgba(255,80,180,0.2); border-radius: 12px; text-align: center;">
            <div style="font-size: 20px; margin-bottom: 8px;">📍</div>
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Санкт-Петербург, м. Парнас</div>
            <div style="color: #aaa; font-size: 14px;">ул. Заречная, 10</div>
        </div>
        <div style="margin-top: 16px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; font-size: 13px; color: #888; text-align: center;">
            Если нужно перенести или отменить запись — свяжитесь с нами заранее
        </div>
        <div style="margin-top: 12px; font-size: 11px; color: #333; text-align: center;">
            Это письмо отправлено автоматически, отвечать на него не нужно
        </div>
    </div>
    """

    # Сохраняем в расписание БД
    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.schedule (client_name, client_phone, services, master, booking_date, booking_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'confirmed')
        """, (name, phone, service, master, day, time))
        # Также в bookings
        cur.execute(f"""
            INSERT INTO {SCHEMA}.bookings (client_name, client_phone, client_email, service, master, booking_date, booking_time, price, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'new')
        """, (name, phone, client_email, service, master, day, time, price if price else 0))
        conn.commit()
        conn.close()
    except Exception:
        pass

    with smtplib.SMTP_SSL("smtp.mail.ru", 465) as server:
        server.login(smtp_user, smtp_password)
        send_email(server, smtp_user, owner_email, f"Новая запись: {service} — {name}", owner_html)
        if client_email:
            send_email(server, smtp_user, client_email, f"Ваша запись подтверждена — {service}", client_html)

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"ok": True}),
    }