
-- Дата рождения клиента
ALTER TABLE t_p3248579_online_booking_app.clients
  ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Чёрный список
CREATE TABLE t_p3248579_online_booking_app.blacklist (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES t_p3248579_online_booking_app.clients(id),
  phone VARCHAR(30),
  name VARCHAR(200),
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Настройки сайта (обложка, цвет, адрес, выходные и т.д.)
CREATE TABLE t_p3248579_online_booking_app.site_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p3248579_online_booking_app.site_settings (key, value) VALUES
  ('hero_color_from', 'hsl(335 80% 58%)'),
  ('hero_color_to', 'hsl(315 70% 65%)'),
  ('salon_address', 'ул. Заречная, 10, м. Парнас'),
  ('salon_phone', '+79046015556'),
  ('salon_maps_url', 'https://yandex.ru/maps/org/devchachiy_ray/46803820767'),
  ('days_off', '[]'),
  ('salon_name', 'Girly Paradise'),
  ('wall_image_url', '');

-- Шаблоны уведомлений
CREATE TABLE t_p3248579_online_booking_app.notification_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200),
  body TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p3248579_online_booking_app.notification_templates (template_key, title, body) VALUES
  ('booking_confirm', 'Запись подтверждена', 'Girly Paradise: ваша запись подтверждена! Услуга: {service}. {day} в {time}. Ждём вас! Адрес: {address}.'),
  ('booking_reminder', 'Напоминание о записи', 'Girly Paradise: напоминаем, что вы записаны на {service}. {day} в {time}. Адрес: {address}.'),
  ('booking_cancel', 'Запись отменена', 'Girly Paradise: ваша запись отменена. Если хотите перенести — позвоните нам: {phone} или запишитесь снова на сайте.'),
  ('review_request', 'Просьба оставить отзыв', 'Girly Paradise: спасибо, что были у нас! Будем рады вашему отзыву 🌸 {phone}'),
  ('promo', 'Запишитесь снова', 'Girly Paradise: давно не были у нас? Приходите на процедуры! Запись: {phone} или онлайн.');

-- Скидки клиентов
ALTER TABLE t_p3248579_online_booking_app.clients
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
