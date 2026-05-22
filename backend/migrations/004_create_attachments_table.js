const pool = require('../src/config/db');

const createAttachmentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
