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

    id              SERIAL PRIMARY KEY,

    name            VARCHAR(100)        NOT NULL,

    email           VARCHAR(100) UNIQUE NOT NULL,

    password        VARCHAR(255)        NOT NULL,          -- bcrypt hash

    phone           VARCHAR(20)         NOT NULL,

    bank_account    VARCHAR(50)         NOT NULL,          -- për pagesa dhe rimbursime

    role            VARCHAR(20)         NOT NULL DEFAULT 'participant'

                        CHECK (role IN ('organizer', 'participant', 'admin')),

    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP

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



-- ============================================================

--  8. MATCH PLAYERS (Player invitations and participation)

--  Mbështet: User invitation system, real-time confirmation

-- ============================================================

CREATE TABLE MatchPlayers (

    id              SERIAL PRIMARY KEY,

    booking_id      INT             NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,

    user_id         INT             NOT NULL REFERENCES Users(id),

    invitation_status VARCHAR(20)   NOT NULL DEFAULT 'invited'

                        CHECK (invitation_status IN ('invited', 'pending', 'accepted', 'declined')),

    is_organizer    BOOLEAN         NOT NULL DEFAULT FALSE,

    invited_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    responded_at    TIMESTAMP       DEFAULT NULL,

    check_in_status VARCHAR(20)     DEFAULT NULL

                        CHECK (check_in_status IN ('checked_in', 'no_show', NULL)),

    checked_in_at   TIMESTAMP       DEFAULT NULL,

    UNIQUE (booking_id, user_id)   -- një lojtar, një pjesëmarrje për ndeshje

);



-- ============================================================

--  9. USER PROFILES (Extended user information)

--  Mbështet: Registration requirements, bank info, phone

-- ============================================================

CREATE TABLE UserProfiles (

    id              SERIAL PRIMARY KEY,

    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

    username        VARCHAR(50)     UNIQUE NOT NULL,    -- Matchday username për ftesa

    phone_number    VARCHAR(20)     NOT NULL,

    bank_account    VARCHAR(50)     NOT NULL,          -- për pagesa dhe rimbursime

    avatar_url      VARCHAR(255)    DEFAULT NULL,

    date_of_birth   DATE            DEFAULT NULL,

    preferred_position VARCHAR(50)   DEFAULT NULL,      -- goalkeeper, defender, etc.

    skill_level     VARCHAR(20)     DEFAULT 'intermediate'

                        CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional')),

    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP

);



-- ============================================================

-- 10. NOTIFICATION PREFERENCES

-- Mbështet: User-controlled notification settings

-- ============================================================

CREATE TABLE NotificationPreferences (

    id              SERIAL PRIMARY KEY,

    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

    email_invitations   BOOLEAN     NOT NULL DEFAULT TRUE,

    email_confirmations BOOLEAN     NOT NULL DEFAULT TRUE,

    email_cancellations BOOLEAN     NOT NULL DEFAULT TRUE,

    push_invitations   BOOLEAN     NOT NULL DEFAULT TRUE,

    push_confirmations BOOLEAN     NOT NULL DEFAULT TRUE,

    push_cancellations BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id)

);



-- ============================================================

-- 11. MATCH SESSIONS (For check-in tracking and attendance)

-- Mbështet: Check-in system, auto-cancel, no-show detection

-- ============================================================

CREATE TABLE MatchSessions (

    id              SERIAL PRIMARY KEY,

    booking_id      INT             NOT NULL REFERENCES Bookings(id) ON DELETE CASCADE,

    start_time      TIMESTAMP       NOT NULL,

    end_time        TIMESTAMP       NOT NULL,

    check_in_deadline TIMESTAMP     NOT NULL, -- 15 min para fillimit

    auto_cancel_deadline TIMESTAMP NOT NULL, -- 2 orë para fillimit

    total_players   INT             NOT NULL DEFAULT 0,

    checked_in_players INT         NOT NULL DEFAULT 0,

    session_status  VARCHAR(20)     NOT NULL DEFAULT 'scheduled'

                        CHECK (session_status IN ('scheduled', 'active', 'completed', 'cancelled', 'no_show')),

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP

);



-- ============================================================

-- 12. PAYMENT TRANSACTIONS (Detailed payment tracking)

-- Mbështet: Cash vs card payment methods, transaction history

-- ============================================================

CREATE TABLE PaymentTransactions (

    id              SERIAL PRIMARY KEY,

    payment_id      INT             NOT NULL REFERENCES PlayerPayments(id) ON DELETE CASCADE,

    transaction_type VARCHAR(20)    NOT NULL

                        CHECK (transaction_type IN ('payment', 'refund', 'penalty')),

    amount          DECIMAL(10, 2)  NOT NULL,

    payment_method  VARCHAR(20)     NOT NULL

                        CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'online')),

    transaction_reference VARCHAR(100) DEFAULT NULL, -- bank reference, transaction ID

    processed_by    INT             DEFAULT NULL REFERENCES Users(id), -- admin who processed

    notes           TEXT            DEFAULT NULL,

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP

);



-- ============================================================

-- 13. FIELD AVAILABILITY (Time slot management)

-- Mbështet: Real-time availability, booking conflicts prevention

-- ============================================================

CREATE TABLE FieldAvailability (

    id              SERIAL PRIMARY KEY,

    field_id        INT             NOT NULL REFERENCES Fields(id) ON DELETE CASCADE,

    date            DATE            NOT NULL,

    start_time      TIME            NOT NULL,

    end_time        TIME            NOT NULL,

    is_available    BOOLEAN         NOT NULL DEFAULT TRUE,

    booking_id      INT             DEFAULT NULL REFERENCES Bookings(id) ON DELETE SET NULL,

    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (field_id, date, start_time)

);



-- ============================================================

-- ADDITIONAL INDEXES for performance

-- ============================================================

CREATE INDEX idx_match_players_booking_id   ON MatchPlayers(booking_id);

CREATE INDEX idx_match_players_user_id     ON MatchPlayers(user_id);

CREATE INDEX idx_match_players_status      ON MatchPlayers(invitation_status);

CREATE INDEX idx_user_profiles_username    ON UserProfiles(username);

CREATE INDEX idx_user_profiles_user_id     ON UserProfiles(user_id);

CREATE INDEX idx_match_sessions_booking_id ON MatchSessions(booking_id);

CREATE INDEX idx_match_sessions_status     ON MatchSessions(session_status);

CREATE INDEX idx_payment_transactions_payment_id ON PaymentTransactions(payment_id);

CREATE INDEX idx_field_availability_field_date ON FieldAvailability(field_id, date);



-- ============================================================

-- TRIGGERS for automatic updates

-- ============================================================

-- Update UserProfiles updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()

RETURNS TRIGGER AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$ language 'plpgsql';



CREATE TRIGGER update_user_profiles_updated_at 

    BEFORE UPDATE ON UserProfiles 

    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



CREATE TRIGGER update_notification_preferences_updated_at 

    BEFORE UPDATE ON NotificationPreferences 

    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



CREATE TRIGGER update_field_availability_updated_at 

    BEFORE UPDATE ON FieldAvailability 

    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- ============================================================

-- VIEWS for complex queries

-- ============================================================



-- Complete match information with players and payments

CREATE VIEW MatchDetails AS

SELECT

    b.id AS booking_id,

    b.field_id,

    f.name AS field_name,

    f.terrain_type,

    f.location,

    b.start_time,

    b.end_time,

    b.total_price,

    b.price_per_player,

    b.status AS booking_status,

    u.name AS organizer_name,

    up.username AS organizer_username,

    COUNT(mp.id) AS total_players,

    COUNT(CASE WHEN mp.invitation_status = 'accepted' THEN 1 END) AS accepted_players,

    COUNT(CASE WHEN mp.invitation_status = 'pending' THEN 1 END) AS pending_players,

    COUNT(CASE WHEN mp.check_in_status = 'checked_in' THEN 1 END) AS checked_in_players,

    SUM(pp.total_amount) AS total_collected,

    b.created_at

FROM Bookings b

JOIN Fields f ON b.field_id = f.id

JOIN Users u ON b.organizer_id = u.id

LEFT JOIN UserProfiles up ON u.id = up.user_id

LEFT JOIN MatchPlayers mp ON b.id = mp.booking_id

LEFT JOIN PlayerPayments pp ON b.id = pp.booking_id AND mp.user_id = pp.user_id

GROUP BY b.id, f.name, f.terrain_type, f.location, u.name, up.username;



-- Player's upcoming matches

CREATE VIEW PlayerUpcomingMatches AS

SELECT

    b.id AS booking_id,

    b.start_time,

    b.end_time,

    f.name AS field_name,

    f.location,

    b.price_per_player,

    mp.invitation_status,

    pp.status AS payment_status,

    pp.total_amount,

    mp.check_in_status

FROM Bookings b

JOIN Fields f ON b.field_id = f.id

JOIN MatchPlayers mp ON b.id = mp.booking_id

LEFT JOIN PlayerPayments pp ON b.id = pp.booking_id AND mp.user_id = pp.user_id

WHERE b.start_time >= CURRENT_DATE

  AND b.status IN ('pending', 'confirmed')

  AND mp.invitation_status IN ('invited', 'pending', 'accepted');



-- Admin statistics dashboard

CREATE VIEW AdminStatistics AS

SELECT

    COUNT(DISTINCT b.id) AS total_bookings,

    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) AS confirmed_bookings,

    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,

    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,

    COUNT(DISTINCT u.id) AS total_users,

    COUNT(DISTINCT CASE WHEN u.role = 'organizer' THEN u.id END) AS organizers,

    COUNT(DISTINCT CASE WHEN u.role = 'participant' THEN u.id END) AS participants,

    COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.id END) AS admins,

    COALESCE(SUM(b.total_price), 0) AS total_revenue,

    COALESCE(SUM(CASE WHEN pp.status = 'paid' THEN pp.total_amount ELSE 0 END), 0) AS collected_revenue,

    COUNT(DISTINCT f.id) AS total_fields

FROM Bookings b

CROSS JOIN Users u

CROSS JOIN Fields f

LEFT JOIN PlayerPayments pp ON b.id = pp.booking_id;