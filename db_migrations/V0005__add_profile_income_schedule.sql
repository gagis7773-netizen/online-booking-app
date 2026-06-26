
CREATE TABLE t_p3248579_online_booking_app.owner_profile (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) DEFAULT 'Галина',
  surname VARCHAR(100) DEFAULT 'Сиплатова',
  birthdate DATE,
  site_name VARCHAR(200) DEFAULT 'Girly Paradise',
  phone VARCHAR(20) DEFAULT '+79046015556',
  email VARCHAR(200) DEFAULT 'Siplatova777@list.ru',
  specialization VARCHAR(300) DEFAULT 'Косметолог-эстетист',
  about TEXT DEFAULT '',
  vk_url VARCHAR(300) DEFAULT 'https://vk.ru/world_of_galis',
  instagram_url VARCHAR(300) DEFAULT '',
  telegram_url VARCHAR(300) DEFAULT '',
  whatsapp_url VARCHAR(300) DEFAULT '',
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p3248579_online_booking_app.owner_profile (name, surname, specialization)
VALUES ('Галина', 'Сиплатова', 'Косметолог-эстетист');

CREATE TABLE t_p3248579_online_booking_app.income (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category VARCHAR(100) DEFAULT 'Услуги',
  income_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE t_p3248579_online_booking_app.work_schedule (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL,
  is_working BOOLEAN DEFAULT true,
  time_from VARCHAR(5) DEFAULT '11:00',
  time_to VARCHAR(5) DEFAULT '20:00',
  notes TEXT
);

INSERT INTO t_p3248579_online_booking_app.work_schedule (day_of_week, is_working, time_from, time_to)
VALUES (0,true,'11:00','20:00'),(1,true,'11:00','20:00'),(2,true,'11:00','20:00'),
       (3,true,'11:00','20:00'),(4,true,'11:00','20:00'),(5,true,'11:00','20:00'),(6,true,'11:00','20:00');
