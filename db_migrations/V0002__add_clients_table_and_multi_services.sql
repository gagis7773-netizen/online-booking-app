
CREATE TABLE t_p3248579_online_booking_app.clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE t_p3248579_online_booking_app.bookings
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES t_p3248579_online_booking_app.clients(id),
  ADD COLUMN IF NOT EXISTS services TEXT NULL;
