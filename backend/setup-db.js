const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default postgres database first
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL server...');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'task_manager_db';
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✓ Database '${dbName}' created`);

    await client.end();
    console.log('✓ Database setup complete!');
  } catch (err) {
    console.error('Error setting up database:', err.message);
    process.exit(1);
  }
}

setupDatabase();
