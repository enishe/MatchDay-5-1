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
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'"
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
