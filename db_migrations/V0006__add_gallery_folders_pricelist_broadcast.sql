
CREATE TABLE t_p3248579_online_booking_app.gallery_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cover_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE t_p3248579_online_booking_app.admin_gallery
  ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES t_p3248579_online_booking_app.gallery_folders(id);

CREATE TABLE t_p3248579_online_booking_app.pricelist_custom (
  id SERIAL PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  category VARCHAR(150) NOT NULL,
  price VARCHAR(100),
  duration VARCHAR(100),
  description TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.broadcast_log (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  channels TEXT,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.monthly_finance (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_income NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  profit NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(year, month)
);

INSERT INTO t_p3248579_online_booking_app.gallery_folders (name, description, sort_order)
VALUES ('До и после', 'Результаты процедур', 1), ('Работы', 'Примеры наших работ', 2);
