
-- Таблица для кеша отзывов с Яндекс Карт
CREATE TABLE t_p3248579_online_booking_app.yandex_reviews (
  id SERIAL PRIMARY KEY,
  yandex_id VARCHAR(200) UNIQUE,
  author_name VARCHAR(200),
  text TEXT,
  rating INTEGER DEFAULT 5,
  review_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- Рейтинг организации на Яндекс Картах
CREATE TABLE t_p3248579_online_booking_app.yandex_org_rating (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(100) UNIQUE NOT NULL,
  rating NUMERIC(3,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);

-- Документы и сертификаты
CREATE TABLE t_p3248579_online_booking_app.documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  doc_type VARCHAR(50) DEFAULT 'certificate',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
