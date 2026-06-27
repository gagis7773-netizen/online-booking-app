
-- Категории товаров
CREATE TABLE t_p3248579_online_booking_app.shop_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Товары
CREATE TABLE t_p3248579_online_booking_app.shop_products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES t_p3248579_online_booking_app.shop_categories(id),
  name VARCHAR(300) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  photo_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Заказы
CREATE TABLE t_p3248579_online_booking_app.shop_orders (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES t_p3248579_online_booking_app.clients(id),
  client_name VARCHAR(200),
  client_phone VARCHAR(30),
  delivery_type VARCHAR(50) DEFAULT 'sdek', -- sdek / ozon / post
  delivery_address TEXT,
  pickup_point TEXT,
  status VARCHAR(50) DEFAULT 'new', -- new / confirmed / shipped / done / cancelled
  total_amount NUMERIC(10,2) DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Позиции заказа
CREATE TABLE t_p3248579_online_booking_app.shop_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES t_p3248579_online_booking_app.shop_orders(id),
  product_id INTEGER REFERENCES t_p3248579_online_booking_app.shop_products(id),
  product_name VARCHAR(300),
  price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1
);

-- Начальные категории
INSERT INTO t_p3248579_online_booking_app.shop_categories (name, sort_order)
VALUES
  ('Косметика', 1),
  ('Массажёры', 2),
  ('Духи женские', 3),
  ('Духи мужские', 4);
