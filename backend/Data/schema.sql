-- MatchDay 5+1 Database Schema (Optimized)
-- Autor: Enis Hetemi

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'player' -- 'organizer', 'player', 'admin'
);

CREATE TABLE Fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50), -- 'Sallë Futsali' ose 'Bar Artificial' (User Story #1)
    price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 60.00
);

CREATE TABLE Bookings (
    id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Fields(id) ON DELETE CASCADE,
    organizer_id INT REFERENCES Users(id),
    start_time TIMESTAMP NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'confirmed', 'canceled' (User Story #6)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela për pagesat individuale (Zgjidh User Story #2, #3, #4)
CREATE TABLE PlayerPayments (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES Bookings(id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(id),
    field_share DECIMAL(10, 2) DEFAULT 5.00, -- Smart Split (User Story #2)
    rental_fee DECIMAL(10, 2) DEFAULT 0.00,  -- +2€ nëse ka patika (User Story #3)
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP
);