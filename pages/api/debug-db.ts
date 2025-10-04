import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing database connection...');
    
    // Тест 1: Проверка подключения
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log('Connection test passed:', connectionTest.rows[0]);
    
    // Тест 2: Проверка таблиц
    const tablesTest = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables found:', tablesTest.rows);
    
    // Тест 3: Проверка структуры таблицы employees
    const employeesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employees'
      ORDER BY ordinal_position
    `);
    console.log('Employees table structure:', employeesStructure.rows);

    res.status(200).json({
      success: true,
      connection: connectionTest.rows[0],
      tables: tablesTest.rows,
      employees_structure: employeesStructure.rows
    });
    
  } catch (error) {
    console.error('Debug DB Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}