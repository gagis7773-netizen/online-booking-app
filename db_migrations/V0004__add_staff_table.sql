
CREATE TABLE t_p3248579_online_booking_app.staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'specialist',
  pin VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p3248579_online_booking_app.staff (name, phone, role, pin)
VALUES ('Галина (Владелец)', '+79046015556', 'owner', '2025');
