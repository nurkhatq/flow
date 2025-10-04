import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
        res.status(200).json(result.rows);
        break;

      case 'POST':
        const { id, name, position, avatar, color } = req.body;
        const insertResult = await pool.query(
          'INSERT INTO employees (id, name, position, avatar, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [id, name, position, avatar, color]
        );
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        await pool.query('DELETE FROM employees WHERE id = $1', [deleteId]);
        res.status(200).json({ message: 'Employee deleted' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}