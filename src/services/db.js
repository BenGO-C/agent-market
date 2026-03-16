'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

module.exports = {
  connect: async () => {
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connected');
  },
  query: (text, params) => pool.query(text, params),
  pool,
};
