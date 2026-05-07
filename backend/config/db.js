const { Pool } = require('pg');

const isSSL = process.env.DB_SSL !== 'false';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSSL ? { rejectUnauthorized: false } : false
});

module.exports = pool;