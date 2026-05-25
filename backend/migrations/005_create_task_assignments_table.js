/**
 * 005_create_task_assignments_table.js – Migration: Create Task Assignments Table
 *
 * Creates the `task_assignments` join table that links tasks to multiple
 * assigned users. This enables assigning more than one team member to a
 * single task (many-to-many between tasks and users).
 *
 * Run ONCE after the tasks and users tables already exist:
 *   node backend/migrations/005_create_task_assignments_table.js
 *
 * Schema:
 *  id           SERIAL PRIMARY KEY
 *  task_id      INTEGER FK → tasks(id)  ON DELETE CASCADE
 *  user_id      INTEGER FK → users(id)  ON DELETE CASCADE
 *  assigned_at  TIMESTAMP DEFAULT NOW()
 *  UNIQUE(task_id, user_id) – prevents duplicate assignment rows
 *
 * Prerequisites: migrations 001 (users) and 002 (tasks) must be applied first.
 */

const pool = require('../src/config/db');

/**
 * Creates the `task_assignments` table if it does not already exist.
 * The UNIQUE constraint on (task_id, user_id) means re-running the migration
 * (or re-assigning the same user to the same task) is safe – it will no-op
 * rather than creating duplicate rows (via ON CONFLICT DO NOTHING in the app).
 *
 * @async
 * @returns {Promise<void>}
 */
const createTaskAssignmentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS task_assignments (
      id          SERIAL PRIMARY KEY,
      task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (task_id, user_id)
    );
  `;
  try {
    await pool.query(query);
    console.log('✓ task_assignments table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating task_assignments table:', err);
    process.exit(1);
  }
};

createTaskAssignmentsTable();
