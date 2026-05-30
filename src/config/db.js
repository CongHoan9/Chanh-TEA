const { Pool } = require('pg');
const config = require('./app.config');

if (!config.databaseUrl) {
  throw new Error('Missing DATABASE_URL. Add your Supabase PostgreSQL connection string to .env or Render env vars.');
}

const isLocalDatabase =
  config.databaseUrl.includes('localhost') ||
  config.databaseUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
