
INSERT INTO t_p3248579_online_booking_app.site_settings (key, value)
VALUES
  ('section_pricelist_img', ''),
  ('section_gallery_img', ''),
  ('section_reviews_img', ''),
  ('section_documents_img', '')
ON CONFLICT (key) DO NOTHING;
