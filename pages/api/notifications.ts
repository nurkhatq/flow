import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;

  console.log(`Notifications API: ${method} request`);

  try {
    switch (method) {
      case 'GET':
        const { employeeId: queryEmployeeId } = req.query;
        console.log('Fetching notifications for employee:', queryEmployeeId);
        
        if (!queryEmployeeId || Array.isArray(queryEmployeeId)) {
          return res.status(400).json({ error: 'Valid employeeId is required' });
        }

        const result = await pool.query(
          'SELECT * FROM notifications WHERE employee_id = $1 ORDER BY created_at DESC',
          [queryEmployeeId]
        );
        
        // Преобразуем snake_case в camelCase
        const notifications = result.rows.map(row => ({
          id: row.id,
          employeeId: row.employee_id,  // ← Важно!
          taskId: row.task_id,
          message: row.message,
          read: row.read,
          created_at: row.created_at
        }));
        
        console.log(`Found ${notifications.length} notifications`);
        res.status(200).json(notifications);
        break;

      case 'POST':
        console.log('Creating notification:', req.body);
        const { id, employeeId: notificationEmployeeId, taskId, message } = req.body;
        
        if (!notificationEmployeeId || !message) {
          return res.status(400).json({ error: 'Employee ID and message are required' });
        }

        const insertResult = await pool.query(
          'INSERT INTO notifications (id, employee_id, task_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
          [id, notificationEmployeeId, taskId, message]
        );
        
        console.log('Notification created:', insertResult.rows[0]);
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'PUT':
        console.log('Updating notification:', req.body);
        const { id: updateId, read } = req.body;
        
        await pool.query('UPDATE notifications SET read = $1 WHERE id = $2', [read, updateId]);
        res.status(200).json({ message: 'Notification updated successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'OPTIONS']);
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Notifications API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
}