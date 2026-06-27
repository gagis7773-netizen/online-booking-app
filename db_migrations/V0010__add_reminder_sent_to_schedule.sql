
ALTER TABLE t_p3248579_online_booking_app.schedule
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
