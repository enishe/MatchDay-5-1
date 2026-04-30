const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[DB] DATABASE_URL is not set. Falling back to local postgres defaults.');
}

const isLocalConnection =
  !connectionString ||
  /localhost|127\.0\.0\.1/i.test(connectionString) ||
  process.env.DB_SSL === 'false';

const pool = new Pool({
  connectionString,
  ssl: isLocalConnection ? false : { rejectUnauthorized: false },
});

module.exports = pool;