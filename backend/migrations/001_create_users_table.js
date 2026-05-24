/**
 * 001_create_users_table.js – Migration: Create Users Table
 *
 * First migration in the sequence. Creates the `users` table that stores
 * all registered accounts. Must be run before any other migration because
 * the tasks table references users via foreign keys.
 *
 * Run once: node backend/migrations/001_create_users_table.js
 * Safe to re-run: CREATE TABLE IF NOT EXISTS is idempotent.
 *
 * Schema:
 *  id         SERIAL PRIMARY KEY          Auto-increment integer PK
 *  email      VARCHAR(255) UNIQUE NOT NULL Unique email address
 *  password   VARCHAR(255) NOT NULL        bcrypt hash (never plaintext)
 *  name       VARCHAR(255) NOT NULL        Display name
 *  role       VARCHAR(50)  DEFAULT 'member' 'admin' | 'member'
 *  avatar_url VARCHAR(255)                 Nullable – relative path to avatar
 *  created_at TIMESTAMP    DEFAULT NOW()
 *  updated_at TIMESTAMP    DEFAULT NOW()
 */

const pool = require('../src/config/db');

/**
 * Creates the `users` table if it does not already exist.
 * Exits with code 0 on success or 1 on failure so this script can be
 * used in CI pipelines and shell scripts that check exit codes.
 *
 * @async
 * @returns {Promise<void>}
 */
const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      name       VARCHAR(255) NOT NULL,
      role       VARCHAR(50)  DEFAULT 'member',
      avatar_url VARCHAR(255),
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✓ Users table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating users table:', err);
    process.exit(1);
  }
};

createUsersTable();
