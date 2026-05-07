const pool = require('./db');

const MITROVICA_FIELDS = [
  { name: 'Trepça Sport Center', location: 'Mitrovicë', terrain: 'artificial_grass', price_per_hour: 60, courts: 2 },
  { name: 'Kompleksi Ibar', location: 'Mitrovicë', terrain: 'artificial_grass', price_per_hour: 55, courts: 4 },
  { name: 'Salla Nafaka', location: 'Mitrovicë', terrain: 'indoor_hall', price_per_hour: 50, courts: 1 },
  { name: 'Suhodoll FC', location: 'Suhodoll Mitrovicë', terrain: 'artificial_grass', price_per_hour: 45, courts: 2 },
  { name: 'Arena Vushtrri', location: 'Vushtrri 15km from Mitrovica', terrain: 'artificial_grass', price_per_hour: 50, courts: 3 },
  { name: 'Salla Zveçan', location: 'Zveçan 5km from Mitrovica', terrain: 'indoor_hall', price_per_hour: 45, courts: 1 },
];

async function ensureSchema() {
  const alters = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account VARCHAR(80)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_field_id INTEGER',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT',
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (e) {
      console.warn('[ensureSchema] alter skip:', e.message);
    }
  }
  await pool.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT');

  await pool.query('ALTER TABLE fields ADD COLUMN IF NOT EXISTS courts_count INTEGER NOT NULL DEFAULT 1');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS court_number INTEGER');
  try {
    await pool.query('BEGIN');
    await pool.query('DROP VIEW IF EXISTS pendingautocancel CASCADE');
    await pool.query('DROP VIEW IF EXISTS bookingpaymentsummary CASCADE');
    await pool.query('DROP VIEW IF EXISTS matchdetails CASCADE');
    await pool.query('DROP VIEW IF EXISTS MatchDetails CASCADE');
    await pool.query('DROP VIEW IF EXISTS playerupcomingmatches CASCADE');
    await pool.query('DROP VIEW IF EXISTS PlayerUpcomingMatches CASCADE');
    await pool.query(`
      ALTER TABLE bookings
      ALTER COLUMN start_time TYPE TIMESTAMPTZ USING
        CASE
          WHEN start_time IS NULL THEN NULL
          ELSE start_time AT TIME ZONE 'Europe/Belgrade'
        END
    `);
    await pool.query(`
      ALTER TABLE bookings
      ALTER COLUMN end_time TYPE TIMESTAMPTZ USING
        CASE
          WHEN end_time IS NULL THEN NULL
          ELSE end_time AT TIME ZONE 'Europe/Belgrade'
        END
    `);
    await pool.query(`
      ALTER TABLE bookings
      ALTER COLUMN canceled_at TYPE TIMESTAMPTZ USING
        CASE
          WHEN canceled_at IS NULL THEN NULL
          ELSE canceled_at AT TIME ZONE 'Europe/Belgrade'
        END
    `);
    await pool.query(`
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
    `);
    await pool.query(`
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
    `);
    await pool.query(`
      CREATE OR REPLACE VIEW bookingpaymentsummary AS
      SELECT
          b.id AS booking_id,
          b.field_id,
          b.start_time,
          b.status AS booking_status,
          b.total_price,
          b.price_per_player,
          COUNT(pp.id) AS total_players,
          SUM(CASE WHEN pp.status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
          SUM(pp.total_amount) AS collected_amount,
          b.total_price - COALESCE(
            SUM(CASE WHEN pp.status = 'paid' THEN pp.total_amount ELSE 0 END),
            0
          ) AS remaining_amount
      FROM bookings b
      LEFT JOIN playerpayments pp ON pp.booking_id = b.id
      GROUP BY b.id
    `);
    await pool.query(`
      CREATE OR REPLACE VIEW pendingautocancel AS
      SELECT
          b.id AS booking_id,
          b.start_time,
          b.organizer_id,
          bps.paid_count,
          bps.total_players,
          bps.remaining_amount
      FROM bookings b
      JOIN bookingpaymentsummary bps ON bps.booking_id = b.id
      WHERE b.status = 'pending'
        AND b.start_time BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
        AND bps.paid_count < 12
    `);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'"
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed', 'refunded'))"
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0"
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invite_token VARCHAR(100) UNIQUE"
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shoes_summary JSONB DEFAULT '[]'"
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card'))"
  );
  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)"
  );
  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT"
  );
  await pool.query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'users_nickname_unique'
       ) THEN
         ALTER TABLE users ADD CONSTRAINT users_nickname_unique UNIQUE (nickname);
       END IF;
     END $$;`
  );

  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS field_shoes_inventory (
      id SERIAL PRIMARY KEY,
      field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
      shoe_size SMALLINT NOT NULL CHECK (shoe_size BETWEEN 36 AND 45),
      quantity_available INTEGER NOT NULL DEFAULT 3 CHECK (quantity_available >= 0),
      rent_price NUMERIC(10,2) NOT NULL DEFAULT 2.00,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (field_id, shoe_size)
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_field_shoes_inventory_updated_at'
      ) THEN
        CREATE TRIGGER update_field_shoes_inventory_updated_at
        BEFORE UPDATE ON field_shoes_inventory
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT friend_no_self CHECK (from_user_id <> to_user_id),
      UNIQUE (from_user_id, to_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_participants (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      invite_email VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'paid')),
      needs_shoes BOOLEAN DEFAULT false,
      shoe_size SMALLINT,
      amount_due DECIMAL(10,2) NOT NULL DEFAULT 5.00,
      amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(10) DEFAULT 'card',
      paid_at TIMESTAMP,
      invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booking_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      booking_id INTEGER REFERENCES bookings(id),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      recipient_type VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (recipient_type IN ('user', 'admin')),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(10) NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50)`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200)`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject VARCHAR(255)`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_sent BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`UPDATE notifications SET recipient_type = 'user' WHERE recipient_type IS NULL`);
  await pool.query(`UPDATE notifications SET title = COALESCE(title, subject, type, 'Njoftim') WHERE title IS NULL`);
  await pool.query(`UPDATE notifications SET message = COALESCE(message, body, '') WHERE message IS NULL`);
  await pool.query(`UPDATE notifications SET subject = COALESCE(subject, title, type, 'Njoftim') WHERE subject IS NULL`);
  await pool.query(`UPDATE notifications SET body = COALESCE(body, message, '') WHERE body IS NULL`);
  await pool.query(`UPDATE notifications SET is_read = COALESCE(is_read, false)`);
  await pool.query(`UPDATE notifications SET is_sent = COALESCE(is_sent, is_read, false)`);
  await pool.query(`UPDATE notifications SET user_id = recipient_id WHERE user_id IS NULL AND recipient_id IS NOT NULL`);
  await pool.query(`UPDATE notifications SET recipient_id = user_id WHERE recipient_id IS NULL AND user_id IS NOT NULL`);
  await pool.query(`
    UPDATE notifications n
    SET user_id = u.id,
        recipient_id = COALESCE(n.recipient_id, u.id)
    FROM users u
    WHERE n.user_id IS NULL
      AND n.recipient_type = 'admin'
      AND u.role = 'admin'
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications(recipient_id, is_read)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_sent
    ON notifications(user_id, is_sent)
  `);
  await pool.query(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'notifications'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%type%'
      LOOP
        EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', r.conname);
      END LOOP;
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'notifications'
          AND c.conname = 'notifications_type_check'
      ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (
          type IN (
            'new_booking',
            'booking_confirmed',
            'booking_canceled',
            'invite_accepted',
            'invite',
            'invitation',
            'confirmation',
            'cancellation',
            'reminder',
            'refund'
          )
        );
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id SERIAL PRIMARY KEY,
      jti VARCHAR(120) NOT NULL UNIQUE,
      invalidated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at
    ON token_blacklist(expires_at)
  `);
}

async function seedMitrovicaFields() {
  for (const f of MITROVICA_FIELDS) {
    const inserted = await pool.query(
      `INSERT INTO fields (name, terrain_type, price_per_hour, location, is_active)
       SELECT $1::varchar, $2::varchar, $3::numeric, $4::varchar, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM fields WHERE LOWER(TRIM(name::text)) = LOWER(TRIM($1::text))
       )
       RETURNING id`,
      [f.name, f.terrain, f.price_per_hour, f.location]
    );
    if (inserted.rows.length > 0) {
      await pool.query(
        `UPDATE fields
         SET courts_count = $2
         WHERE id = $1`,
        [inserted.rows[0].id, f.courts]
      );
    } else {
      await pool.query(
        `UPDATE fields
         SET location = $2, terrain_type = $3, price_per_hour = $4, courts_count = $5
         WHERE LOWER(TRIM(name::text)) = LOWER(TRIM($1::text))`,
        [f.name, f.location, f.terrain, f.price_per_hour, f.courts]
      );
    }

    await pool.query(
      `INSERT INTO field_shoes_inventory (field_id, shoe_size, quantity_available, rent_price)
       SELECT ff.id, s.size, 3, 2.00
       FROM (SELECT id FROM fields WHERE LOWER(TRIM(name::text)) = LOWER(TRIM($1::text)) LIMIT 1) ff
       CROSS JOIN generate_series(36, 45) AS s(size)
       ON CONFLICT (field_id, shoe_size) DO NOTHING`,
      [f.name]
    );
  }
}

module.exports = { ensureSchema, seedMitrovicaFields };
