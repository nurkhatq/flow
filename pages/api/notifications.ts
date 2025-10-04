import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const { employeeId: queryEmployeeId } = req.query;
        const result = await pool.query(
          'SELECT * FROM notifications WHERE employee_id = $1 ORDER BY created_at DESC',
          [queryEmployeeId]
        );
        res.status(200).json(result.rows);
        break;

      case 'POST':
        const { id, recipientId, taskId, message } = req.body;
        const insertResult = await pool.query(
          'INSERT INTO notifications (id, employee_id, task_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
          [id, recipientId, taskId, message]
        );
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'PUT':
        const { id: updateId, read } = req.body;
        await pool.query('UPDATE notifications SET read = $1 WHERE id = $2', [read, updateId]);
        res.status(200).json({ message: 'Notification updated' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Notifications API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}