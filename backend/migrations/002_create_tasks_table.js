/**
 * 002_create_tasks_table.js – Migration: Create Tasks Table
 *
 * Creates the `tasks` table. Must be run AFTER 001_create_users_table.js
 * because assigned_to and created_by are foreign keys referencing users(id).
 *
 * Run once: node backend/migrations/002_create_tasks_table.js
 *
 * Schema:
 *  id          SERIAL PRIMARY KEY
 *  title       VARCHAR(255) NOT NULL
 *  description TEXT                    Nullable – optional task details
 *  status      VARCHAR(50)  DEFAULT 'pending'
 *                                      Values: 'pending' | 'in_progress' | 'completed'
 *  priority    VARCHAR(50)  DEFAULT 'medium'
 *                                      Values: 'low' | 'medium' | 'high'
 *  due_date    TIMESTAMP               Nullable – optional deadline
 *  assigned_to INTEGER FK → users(id)  Nullable – who the task is assigned to
 *  created_by  INTEGER FK → users(id) NOT NULL – who created the task
 *  created_at  TIMESTAMP DEFAULT NOW()
 *  updated_at  TIMESTAMP DEFAULT NOW()
 *
 * Prerequisites: migration 001 must be applied first.
 */

const pool = require('../src/config/db');

/**
 * Creates the `tasks` table if it does not already exist.
 *
 * @async
 * @returns {Promise<void>}
 */
const createTasksTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      title       VARCHAR(255) NOT NULL,
      description TEXT,
      status      VARCHAR(50)  DEFAULT 'pending',
      priority    VARCHAR(50)  DEFAULT 'medium',
      due_date    TIMESTAMP,
      assigned_to INTEGER      REFERENCES users(id),
      created_by  INTEGER      NOT NULL REFERENCES users(id),
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✓ Tasks table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tasks table:', err);
    process.exit(1);
  }
};

createTasksTable();
