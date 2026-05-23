/**
 * db.js – PostgreSQL Connection Pool
 *
 * Creates and exports a single pg.Pool instance that is shared across the
 * entire application. Re-using one pool (rather than creating a new connection
 * per request) improves performance and prevents connection exhaustion.
 *
 * Configuration is driven entirely by environment variables so credentials
 * are never hard-coded in source control.
 *
 * Environment variables:
 *  DATABASE_URL – Full PostgreSQL connection string, e.g.
 *                 postgres://user:pass@host:5432/dbname
 *
 * SSL note:
 *  rejectUnauthorized: false is required for most cloud PostgreSQL providers
 *  (Render, Heroku, Supabase) whose TLS certificates are not in Node's default
 *  trust store. For a hardened production setup, supply the CA certificate
 *  instead of disabling verification.
 */

const { Pool } = require('pg');
require('dotenv').config(); // Ensure .env is loaded even when this file is imported directly

/**
 * Shared PostgreSQL connection pool.
 * Import this object in any file that needs to run database queries:
 *   const pool = require('../config/db');
 *   const result = await pool.query('SELECT …', [params]);
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * 'error' event listener for idle pool clients.
 *
 * If a client encounters an unexpected error while sitting idle in the pool
 * (e.g. the database server dropped the connection), this handler logs the
 * error and exits the process. Exiting is intentional: a broken pool cannot
 * recover without a restart, and process managers (PM2, Docker, Render) will
 * automatically restart the application.
 *
 * @param {Error} err – The error thrown by the idle client.
 */
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
