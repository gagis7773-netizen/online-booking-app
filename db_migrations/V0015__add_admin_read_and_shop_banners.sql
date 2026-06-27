
-- Метка прочитанности чатов для админа
ALTER TABLE t_p3248579_online_booking_app.chats
  ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMP;

-- Реклама в магазине
CREATE TABLE t_p3248579_online_booking_app.shop_banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300),
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
