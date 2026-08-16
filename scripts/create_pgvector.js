const { Client } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) {
  console.error('No DATABASE_URL or DIRECT_URL found in environment.');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension created or already exists.');
  } catch (err) {
    console.error('Failed to create extension:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
