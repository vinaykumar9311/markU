require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

async function migrate() {
  let client;
  let lockAcquired = false;
  try {
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock(842601202)');
    lockAcquired = true;
    await client.query('BEGIN');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('Database schema migration completed.');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Database migration rollback failed:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (client) {
      if (lockAcquired) {
        try {
          await client.query('SELECT pg_advisory_unlock(842601202)');
        } catch (unlockError) {
          console.error('Database migration lock release failed:', unlockError);
        }
      }
      client.release();
    }
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
