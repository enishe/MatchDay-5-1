-- ============================================================
--  MatchDay 5+1 — Database Schema (Full)
--  Autor: Enis Hetemi
--  Versioni: 2.0 — përputhet me 22 klasat e arkitekturës
-- ============================================================

-- ============================================================
--  1. USERS
--  Klasa: UserRepository, AuthController
--  Mbështet: UserRole enum (ORGANIZER, PARTICIPANT, ADMIN)
-- ============================================================
CREATE TABLE Users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255)        NOT NULL,          -- bcrypt hash
    role        VARCHAR(20)         NOT NULL DEFAULT 'participant'
                    CHECK (role IN ('organizer', 'participant', 'admin')),
    created_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  2. FIELDS
--  Klasa: Field, FieldController
--  Mbështet: TerrainType enum + User Story #1 (filtrim sipas terrenit)
-- ============================================================
CREATE TABLE Fields (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    terrain_type    VARCHAR(50)     NOT NULL
                        CHECK (terrain_type IN ('artificial_grass', 'indoor_hall')),
    price_per_hour  DECIMAL(10, 2)  NOT NULL DEFAULT 60.00,
    location        VARCHAR(255),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  3. SHOES INVENTORY
--  Klasa: ShoesInventory
--  Mbështet: User Story #3 (patika me qira +2€), #8 (email me nr. patikave), #10 (rating)
-- ============================================================
CREATE TABLE ShoesInventory (
    id          SERIAL PRIMARY KEY,
    field_id    INT             NOT NULL REFERENCES Fields(id) ON DELETE CASCADE,
    size        SMALLINT        NOT NULL CHECK (size BETWEEN 36 AND 48),
    rent_price  DECIMAL(10, 2)  NOT NULL DEFAULT 2.00,
    available   BOOLEAN         NOT NULL DEFAULT TRUE,
    condition   VARCHAR(20)     NOT NULL DEFAULT 'good'
                    CHECK (condition IN ('good', 'fair', 'poor')),
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  4. BOOKINGS
--  Klasa: Match, MatchService, MatchController
--  Mbështet: Smart Split #2, anulimi #5/#6/#7, CancellationStatus enum
-- ============================================================
CREATE TABLE Bookings (
    id              SERIAL PRIMARY KEY,
    field_id        INT             NOT NULL REFERENCES Fields(id) ON DELETE CASCADE,
    organizer_id    INT             NOT NULL REFERENCES Users(id),
    start_time      TIMESTAMP       NOT NULL,
    end_time        TIMESTAMP       NOT NULL,
    total_price     DECIMAL(10, 2)  NOT NULL,           -- çmimi total i fushës (p.sh. 60€)
    price_per_player DECIMAL(10, 2) NOT NULL,           -- Smart Split: total/12 (p.sh. 5€)
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'canceled')),
    cancellation_status VARCHAR(20) DEFAULT NULL
                        CHECK (cancellation_status IN ('free', 'penalty_40', 'auto_cancelled')),
    canceled_at     TIMESTAMP       DEFAULT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  5. PLAYER PAYMENTS
--  Klasa: Participant, PaymentService, PaymentController
--  Mbështet: PaymentStatus enum, US #2 (Smart Split), #3 (patika), #4 (pagesa individuale)
-- ============================================================
CREATE TABLE PlayerPayments (
    id              SERIAL PRIMARY KEY,
    booking_id      INT             NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,
    user_id         INT             NOT NULL REFERENCES Users(id),
    field_share     DECIMAL(10, 2)  NOT NULL DEFAULT 5.00,  -- Smart Split (US #2)
    rental_fee      DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,  -- +2€ patika (US #3)
    total_amount    DECIMAL(10, 2)  GENERATED ALWAYS AS (field_share + rental_fee) STORED,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'refunded')),
    shoe_id         INT             DEFAULT NULL REFERENCES ShoesInventory(id),
    paid_at         TIMESTAMP       DEFAULT NULL,
    refunded_at     TIMESTAMP       DEFAULT NULL,
    UNIQUE (booking_id, user_id)    -- një lojtar, një pagesë për ndeshje
);

-- ============================================================
--  6. NOTIFICATIONS
--  Klasa: NotificationService
--  Mbështet: US #8 (email konfirmimi me detaje), dërgim anulimi, kujtues
-- ============================================================
CREATE TABLE Notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES Users(id),
    booking_id  INT             DEFAULT NULL REFERENCES Bookings(id) ON DELETE SET NULL,
    type        VARCHAR(50)     NOT NULL
                    CHECK (type IN ('confirmation', 'cancellation', 'reminder', 'refund')),
    subject     VARCHAR(255)    NOT NULL,
    body        TEXT            NOT NULL,
    sent_at     TIMESTAMP       DEFAULT NULL,
    is_sent     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  7. SHOE RATINGS  (Could Have — US #10)
--  Klasa: ShoesInventory (metoda rating)
--  Mbështet: US #10 (vlerëso cilësinë e patikave pas lojës)
-- ============================================================
CREATE TABLE ShoeRatings (
    id          SERIAL PRIMARY KEY,
    shoe_id     INT         NOT NULL REFERENCES ShoesInventory(id) ON DELETE CASCADE,
    user_id     INT         NOT NULL REFERENCES Users(id),
    booking_id  INT         NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT        DEFAULT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shoe_id, user_id, booking_id)   -- një vlerësim për patikë/lojtar/ndeshje
);

-- ============================================================
--  INDEXES — performancë për queries të zakonshme
-- ============================================================
CREATE INDEX idx_bookings_field_id      ON Bookings(field_id);
CREATE INDEX idx_bookings_organizer_id  ON Bookings(organizer_id);
CREATE INDEX idx_bookings_start_time    ON Bookings(start_time);        -- SchedulerService
CREATE INDEX idx_bookings_status        ON Bookings(status);
CREATE INDEX idx_payments_booking_id    ON PlayerPayments(booking_id);
CREATE INDEX idx_payments_user_id       ON PlayerPayments(user_id);
CREATE INDEX idx_payments_status        ON PlayerPayments(status);
CREATE INDEX idx_shoes_field_id         ON ShoesInventory(field_id);
CREATE INDEX idx_notifications_user_id  ON Notifications(user_id);
CREATE INDEX idx_notifications_is_sent  ON Notifications(is_sent);      -- SchedulerService

-- ============================================================
--  SAMPLE DATA — për testim
-- ============================================================

-- Përdorues
INSERT INTO Users (name, email, password, role) VALUES
    ('Admin Fusha', 'admin@matchday.com',  '$2b$10$hash_placeholder_admin',  'admin'),
    ('Enis Hetemi',  'enis@matchday.com',   '$2b$10$hash_placeholder_enis',   'organizer'),
    ('Lojtar Një',  'lojtar1@matchday.com','$2b$10$hash_placeholder_l1',     'participant'),
    ('Lojtar Dy',   'lojtar2@matchday.com','$2b$10$hash_placeholder_l2',     'participant');

-- Fusha
INSERT INTO Fields (name, terrain_type, price_per_hour, location) VALUES
    ('Fusha Prishtina 1', 'artificial_grass', 60.00, 'Prishtinë, Rruga Agim Ramadani'),
    ('Salla Prizren',     'indoor_hall',       60.00, 'Prizren, Qendra Sportive');

-- Patika
INSERT INTO ShoesInventory (field_id, size, rent_price) VALUES
    (1, 40, 2.00), (1, 41, 2.00), (1, 42, 2.00),
    (1, 43, 2.00), (1, 44, 2.00), (1, 45, 2.00),
    (2, 40, 2.00), (2, 42, 2.00), (2, 44, 2.00);

-- ============================================================
--  VIEWS — query të shpeshta të gatshme
-- ============================================================

-- Gjendja e pagesave për çdo ndeshje (MatchService e përdor për Smart Split check)
CREATE VIEW BookingPaymentSummary AS
SELECT
    b.id                                        AS booking_id,
    b.field_id,
    b.start_time,
    b.status                                    AS booking_status,
    b.total_price,
    b.price_per_player,
    COUNT(pp.id)                                AS total_players,
    SUM(CASE WHEN pp.status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
    SUM(pp.total_amount)                        AS collected_amount,
    b.total_price - COALESCE(SUM(CASE WHEN pp.status = 'paid'
        THEN pp.total_amount ELSE 0 END), 0)   AS remaining_amount
FROM Bookings b
LEFT JOIN PlayerPayments pp ON pp.booking_id = b.id
GROUP BY b.id;

-- Ndeshjet që i afrohen deadline-it 2 orë (SchedulerService e skanon çdo minutë)
CREATE VIEW PendingAutoCancel AS
SELECT
    b.id            AS booking_id,
    b.start_time,
    b.organizer_id,
    bps.paid_count,
    bps.total_players,
    bps.remaining_amount
FROM Bookings b
JOIN BookingPaymentSummary bps ON bps.booking_id = b.id
WHERE b.status = 'pending'
  AND b.start_time BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
  AND bps.paid_count < 12;