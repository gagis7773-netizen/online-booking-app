CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.chats (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES t_p3248579_online_booking_app.chats(id),
    sender VARCHAR(10) NOT NULL,
    message_type VARCHAR(10) DEFAULT 'text',
    content TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.promotions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    discount_text VARCHAR(100),
    image_url TEXT,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.gallery (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    before_url TEXT,
    after_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.reviews (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL,
    review_text TEXT,
    photo_url TEXT,
    service VARCHAR(200),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.sms_log (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p3248579_online_booking_app.bookings (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    client_email VARCHAR(200),
    service VARCHAR(200) NOT NULL,
    master VARCHAR(100),
    booking_date VARCHAR(50),
    booking_time VARCHAR(10),
    price INTEGER DEFAULT 0,
    prepayment INTEGER DEFAULT 0,
    prepayment_status VARCHAR(20) DEFAULT 'none',
    status VARCHAR(20) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON t_p3248579_online_booking_app.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON t_p3248579_online_booking_app.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON t_p3248579_online_booking_app.gallery(category);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON t_p3248579_online_booking_app.promotions(is_active);
