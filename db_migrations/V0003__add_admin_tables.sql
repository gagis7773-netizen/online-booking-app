
CREATE TABLE t_p3248579_online_booking_app.schedule (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES t_p3248579_online_booking_app.bookings(id),
  client_name VARCHAR(100),
  client_phone VARCHAR(20),
  services TEXT,
  master VARCHAR(100),
  booking_date VARCHAR(50),
  booking_time VARCHAR(10),
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.expenses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category VARCHAR(100),
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.notifications (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES t_p3248579_online_booking_app.clients(id),
  client_phone VARCHAR(20),
  message TEXT NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.admin_gallery (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  url TEXT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT now()
);
