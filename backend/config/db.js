const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://matchday_db_e7i5_user:rUCUh0fhdaJvfSJMUAhb6syFYioVytTE@dpg-d77r3n9r0fns738942sg-a.oregon-postgres.render.com/matchday_db_e7i5',
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;