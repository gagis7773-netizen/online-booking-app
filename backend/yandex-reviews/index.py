"""
Получение рейтинга и отзывов с Яндекс Карт для организации Девчачий рай.
Использует парсинг публичного API Яндекс Карт.
"""
import json
import os
import urllib.request
import urllib.parse
import psycopg2
import psycopg2.extras

SCHEMA = "t_p3248579_online_booking_app"
ORG_ID = "46803820767"  # ID организации на Яндекс Картах

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def resp(data, code=200):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}


def fetch_yandex_reviews():
    """Получает отзывы через публичный API Яндекс Бизнес."""
    url = (
        f"https://api-maps.yandex.ru/services/reviews/v2/organization/{ORG_ID}/reviews/"
        f"?lang=ru_RU&origin=map&limit=50&skip=0"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Referer": "https://yandex.ru/maps/",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return data
    except Exception:
        return None


def fetch_org_rating():
    """Получает рейтинг организации."""
    url = (
        f"https://api-maps.yandex.ru/services/reviews/v2/organization/{ORG_ID}/ratings/"
        f"?lang=ru_RU&origin=map"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Referer": "https://yandex.ru/maps/",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception:
        return None


def handler(event: dict, context) -> dict:
    """Синхронизация отзывов и рейтинга с Яндекс Карт."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "get")

    # Получить кешированные отзывы из БД
    if action == "get":
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute(f"""
                SELECT * FROM {SCHEMA}.yandex_reviews
                ORDER BY review_date DESC NULLS LAST LIMIT 50
            """)
            reviews = [dict(r) for r in cur.fetchall()]
            cur.execute(f"SELECT * FROM {SCHEMA}.yandex_org_rating LIMIT 1")
            rating_row = cur.fetchone()
            rating = dict(rating_row) if rating_row else {}
        except Exception:
            reviews = []
            rating = {}
        finally:
            conn.close()
        return resp({"reviews": reviews, "rating": rating})

    # Синхронизировать с Яндекс Картами
    if action == "sync":
        synced = 0
        rating_val = 0.0
        reviews_count = 0

        # Рейтинг
        rating_data = fetch_org_rating()
        if rating_data:
            try:
                rating_val = float(rating_data.get("rating", {}).get("value", 0))
                reviews_count = int(rating_data.get("rating", {}).get("count", 0))
            except Exception:
                pass

        # Отзывы
        reviews_data = fetch_yandex_reviews()
        reviews_list = []
        if reviews_data:
            reviews_list = reviews_data.get("reviews", [])

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Сохраняем рейтинг
        if rating_val > 0:
            cur.execute(f"""
                INSERT INTO {SCHEMA}.yandex_org_rating (org_id, rating, reviews_count, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (org_id) DO UPDATE SET
                    rating = EXCLUDED.rating,
                    reviews_count = EXCLUDED.reviews_count,
                    updated_at = NOW()
            """, (ORG_ID, rating_val, reviews_count))

        # Сохраняем отзывы
        for rv in reviews_list:
            try:
                author = rv.get("author", {}).get("name", "Аноним")
                text = rv.get("text", "")
                stars = int(rv.get("rating", 5))
                review_id = rv.get("id", "")
                review_date = rv.get("updatedTime", rv.get("createdTime", ""))[:10] if rv.get("updatedTime") or rv.get("createdTime") else None

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.yandex_reviews
                        (yandex_id, author_name, text, rating, review_date)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (yandex_id) DO UPDATE SET
                        text = EXCLUDED.text,
                        rating = EXCLUDED.rating
                """, (review_id or f"ya_{author}_{stars}", author, text, stars, review_date))
                synced += 1
            except Exception:
                pass

        # Обновляем reviews_count у мастера
        if reviews_count > 0:
            cur.execute(f"""
                UPDATE {SCHEMA}.masters_custom SET reviews_count = %s WHERE id = 1
            """, (reviews_count,))

        conn.commit()
        conn.close()

        return resp({"ok": True, "synced": synced, "rating": rating_val, "reviews_count": reviews_count})

    return resp({"error": "Unknown action"}, 400)
