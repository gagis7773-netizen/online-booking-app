
INSERT INTO t_p3248579_online_booking_app.site_settings (key, value)
VALUES
  ('payment_card_number', ''),
  ('payment_phone_sbp', ''),
  ('payment_bank_name', 'Сбербанк'),
  ('payment_recipient_name', 'Галина С.'),
  ('payment_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE t_p3248579_online_booking_app.shop_orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'on_delivery',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
