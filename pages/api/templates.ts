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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;

  console.log(`Templates API: ${method} request`);

  try {
    switch (method) {
      case 'GET':
        console.log('Fetching templates...');
        const result = await pool.query('SELECT * FROM templates ORDER BY created_at DESC');
        console.log(`Found ${result.rows.length} templates`);
        res.status(200).json(result.rows);
        break;

      case 'POST':
        console.log('Creating template:', req.body);
        const { id, title, description, duration, priority } = req.body;
        
        if (!title || !title.trim()) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const insertResult = await pool.query(
          'INSERT INTO templates (id, title, description, duration, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [id, title.trim(), description || '', duration, priority]
        );
        
        console.log('Template created:', insertResult.rows[0]);
        res.status(201).json(insertResult.rows[0]);
        break;

      case 'PUT':
        console.log('Updating template:', req.body);
        const { id: updateId, title: updateTitle, description: updateDescription, 
                duration: updateDuration, priority: updatePriority } = req.body;
        
        const updateResult = await pool.query(
          'UPDATE templates SET title = $1, description = $2, duration = $3, priority = $4 WHERE id = $5 RETURNING *',
          [updateTitle, updateDescription, updateDuration, updatePriority, updateId]
        );
        
        console.log('Template updated:', updateResult.rows[0]);
        res.status(200).json(updateResult.rows[0]);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        console.log('Deleting template:', deleteId);
        
        if (!deleteId || Array.isArray(deleteId)) {
          return res.status(400).json({ error: 'Valid ID is required' });
        }

        await pool.query('DELETE FROM templates WHERE id = $1', [deleteId]);
        res.status(200).json({ message: 'Template deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Templates API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
}