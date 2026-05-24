/**
 * 004_create_attachments_table.js – Migration: Create Attachments Table
 *
 * Creates the `attachments` table that records metadata for files uploaded
 * and linked to tasks. The actual binary files are stored on disk in
 * /backend/uploads/tasks/; this table stores only the metadata needed to
 * reference and serve them.
 *
 * Run once: node backend/migrations/004_create_attachments_table.js
 *
 * Schema:
 *  id          SERIAL PRIMARY KEY
 *  task_id     INTEGER FK → tasks(id) ON DELETE CASCADE
 *              Deleting a task removes its attachment records. Note: physical
 *              files on disk are NOT deleted automatically – a cleanup job
 *              would be needed to reclaim disk space from orphaned files.
 *  file_name   VARCHAR(255) NOT NULL   Original filename as uploaded
 *  file_url    VARCHAR(255) NOT NULL   Server-relative URL, e.g.
 *                                      /uploads/tasks/task-1718000000000-123.pdf
 *  uploaded_at TIMESTAMP DEFAULT NOW()
 *
 * Prerequisites: migrations 001, 002, and 003 must be applied first.
 */

const pool = require('../src/config/db');

/**
 * Creates the `attachments` table if it does not already exist.
 *
 * @async
 * @returns {Promise<void>}
 */
const createAttachmentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS attachments (
      id          SERIAL PRIMARY KEY,
      task_id     INTEGER      REFERENCES tasks(id) ON DELETE CASCADE,
      file_name   VARCHAR(255) NOT NULL,
      file_url    VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✓ Attachments table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating attachments table:', err);
    process.exit(1);
  }
};

createAttachmentsTable();
