-- MatchDay 5+1 Database Schema
-- Autor: Enis Hetemi

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'player' -- 'player' ose 'admin'
);

CREATE TABLE Fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50), -- 'Sallë' ose 'Bar Artificial'
    price_per_hour DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Bookings (
    id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Fields(id) ON DELETE CASCADE,
    organizer_id INT REFERENCES Users(id),
    start_time TIMESTAMP NOT NULL,
    amount_due DECIMAL(10, 2),
    is_fully_paid BOOLEAN DEFAULT FALSE
);