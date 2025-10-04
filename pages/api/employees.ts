import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
        
        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Name is required' });
        }

        const insertResult = await pool.query(
          'INSERT INTO employees (id, name, position, avatar, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [id, name.trim(), position || 'Employee', avatar, color]
        );
        
        console.log('Employee created:', insertResult.rows[0]);
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        console.log('Deleting employee:', deleteId);
        
        if (!deleteId || Array.isArray(deleteId)) {
          return res.status(400).json({ error: 'Valid ID is required' });
        }

        await pool.query('DELETE FROM employees WHERE id = $1', [deleteId]);
        res.status(200).json({ message: 'Employee deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Employees API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
}