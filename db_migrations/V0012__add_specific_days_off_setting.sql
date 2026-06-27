
INSERT INTO t_p3248579_online_booking_app.site_settings (key, value)
VALUES ('specific_days_off', '[]')
ON CONFLICT (key) DO NOTHING;
