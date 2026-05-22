const pool = require('../src/config/db');

const createChecklistsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS checklists (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
