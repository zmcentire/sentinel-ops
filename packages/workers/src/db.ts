import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query('SELECT 1').catch((err: Error) => {
  console.error('[DB] Connection failed:', err.message);
  process.exit(1);
});