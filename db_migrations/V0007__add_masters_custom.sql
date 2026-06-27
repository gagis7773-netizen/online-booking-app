
CREATE TABLE t_p3248579_online_booking_app.masters_custom (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  spec VARCHAR(300),
  rating NUMERIC(3,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  photo_url TEXT,
  tags TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p3248579_online_booking_app.masters_custom (name, spec, rating, reviews_count, photo_url, tags)
VALUES ('Галина Сиплатова', 'Косметолог-эстетист', 5.0, 0, 
  'https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/8f8e57f4-caad-4931-8d8a-bea880feb389.jpg',
  'СМАС-лифтинг,Биоревитализация,РФ-лифтинг,Криолиполиз');
