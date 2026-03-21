-- Tabela e Përdoruesve
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

-- Tabela e Fushave
CREATE TABLE Fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50), -- 'Sallë' ose 'Bar Artificial'
    price_per_hour DECIMAL(10, 2)
);

-- Tabela e Rezervimeve (Matches)
CREATE TABLE Bookings (
    id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Fields(id),
    organizer_id INT REFERENCES Users(id),
    start_time TIMESTAMP,
    is_fully_paid BOOLEAN DEFAULT FALSE
);