const pool = require('./db');

const MITROVICA_FIELDS = [
  { name: 'Fusha Trepça Sport', location: 'Mitrovicë, Rruga Mbretëresha Teutë', terrain: 'artificial_grass', price_per_hour: 60 },
  { name: 'Kompleksi Sportiv Ibar', location: 'Mitrovicë, Lagja Bosnjaku', terrain: 'artificial_grass', price_per_hour: 55 },
  { name: 'Salla Sportive Nafaka', location: 'Mitrovicë, Rruga UÇK', terrain: 'indoor_hall', price_per_hour: 50 },
  { name: 'Fusha Suhodoll FC', location: 'Suhodoll, Mitrovicë', terrain: 'artificial_grass', price_per_hour: 45 },
  { name: 'Arena Vushtrri', location: 'Vushtrri, 15km nga Mitrovica', terrain: 'artificial_grass', price_per_hour: 50 },
  { name: 'Salla Sportive Zveçan', location: 'Zveçan, 5km nga Mitrovica', terrain: 'indoor_hall', price_per_hour: 45 },
];

async function ensureSchema() {
  const alters = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account VARCHAR(80)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_field_id INTEGER REFERENCES fields(id)',
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (e) {
      console.warn('[ensureSchema] alter skip:', e.message);
    }
  }

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
    await pool.query(
      `INSERT INTO fields (name, terrain_type, price_per_hour, location, is_active)
       SELECT $1::varchar, $2::varchar, $3::numeric, $4::varchar, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM fields WHERE LOWER(TRIM(name::text)) = LOWER(TRIM($1::text))
       )`,
      [f.name, f.terrain, f.price_per_hour, f.location]
    );
  }
}

module.exports = { ensureSchema, seedMitrovicaFields };
