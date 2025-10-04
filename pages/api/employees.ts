import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  console.log(`Employees API: ${method} request`);

  try {
    switch (method) {
      case 'GET':
        console.log('Fetching employees...');
        const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
        console.log(`Found ${result.rows.length} employees`);
        res.status(200).json(result.rows);
        break;

      case 'POST':
        console.log('Creating employee:', req.body);
        const { id, name, position, avatar, color } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'Name is required' });
        }

        const insertResult = await pool.query(
          'INSERT INTO employees (id, name, position, avatar, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [id, name, position || 'Employee', avatar, color]
        );
        
        console.log('Employee created:', insertResult.rows[0]);
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        console.log('Deleting employee:', deleteId);
        
        await pool.query('DELETE FROM employees WHERE id = $1', [deleteId]);
        res.status(200).json({ message: 'Employee deleted' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Employees API Error:', error);
    
    // Более детальная информация об ошибке
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: errorMessage,
      // stack: process.env.NODE_ENV === 'development' ? errorStack : undefined // Раскомментируйте для разработки
    });
  }
}