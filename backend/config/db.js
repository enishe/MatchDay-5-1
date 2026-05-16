const { Pool } = require('pg');

/**
 * Normalize DATABASE_URL for cloud Postgres (Neon, Render, etc.).
 * Appends ?sslmode=require when missing so serverless drivers enforce TLS.
 */
function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !String(raw).trim()) {
    return null;
  }

  let url = String(raw).trim();
  const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url) || url.includes('localhost');
  const isNeon = /neon\.tech/i.test(url);
  const needsSslInUrl = (isNeon || process.env.NODE_ENV === 'production') && !isLocal;

  if (needsSslInUrl && !/sslmode=/i.test(url)) {
    url += url.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  return url;
}

/**
 * pg Pool SSL options for Neon / managed Postgres.
 * Local dev: disable unless DB_SSL is explicitly set.
 */
function resolveSsl(connectionString) {
  if (process.env.DB_SSL === 'false') {
    return false;
  }
  if (!connectionString) {
    return false;
  }

  const isLocal =
    /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(connectionString) ||
    connectionString.includes('localhost');

  if (isLocal) {
    return false;
  }

  // Neon and most cloud providers require TLS
  return {
    require: true,
    rejectUnauthorized: false,
  };
}

const connectionString = resolveDatabaseUrl();

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error('[DB] FATAL: DATABASE_URL is not set in production.');
}

const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: resolveSsl(connectionString),
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 10_000,
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 15_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
