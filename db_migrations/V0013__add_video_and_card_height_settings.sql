
INSERT INTO t_p3248579_online_booking_app.site_settings (key, value)
VALUES
  ('video_url', ''),
  ('video_show', 'false'),
  ('video_title', 'Наш салон'),
  ('video_height', '240'),
  ('section_card_height', '140')
ON CONFLICT (key) DO NOTHING;
