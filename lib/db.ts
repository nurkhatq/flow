import { Pool } from 'pg';

console.log('Database URL:', process.env.DATABASE_URL ? 'Exists' : 'Missing');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Добавляем таймауты для лучшей диагностики
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Добавляем обработчики ошибок пула
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;