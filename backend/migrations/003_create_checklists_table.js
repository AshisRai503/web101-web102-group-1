/**
 * 003_create_checklists_table.js – Migration: Create Checklists Table
 *
 * Creates the `checklists` table that stores individual to-do items
 * belonging to a task. Each row is one checklist item that can be marked
 * complete or incomplete.
 *
 * Run once: node backend/migrations/003_create_checklists_table.js
 *
 * Schema:
 *  id         SERIAL PRIMARY KEY
 *  task_id    INTEGER FK → tasks(id) ON DELETE CASCADE
 *             Deleting a task automatically removes all its checklist items.
 *  title      VARCHAR(255) NOT NULL   The checklist item text
 *  completed  BOOLEAN DEFAULT false
 *  created_at TIMESTAMP DEFAULT NOW()
 *
 * ON DELETE CASCADE ensures referential integrity without requiring a
 * separate DELETE query when a parent task is removed.
 *
 * Prerequisites: migrations 001 and 002 must be applied first.
 */

const pool = require('../src/config/db');

/**
 * Creates the `checklists` table if it does not already exist.
 *
 * @async
 * @returns {Promise<void>}
 */
const createChecklistsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS checklists (
      id         SERIAL PRIMARY KEY,
      task_id    INTEGER      REFERENCES tasks(id) ON DELETE CASCADE,
      title      VARCHAR(255) NOT NULL,
      completed  BOOLEAN      DEFAULT false,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✓ Checklists table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating checklists table:', err);
    process.exit(1);
  }
};

createChecklistsTable();
