import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';
import { Database } from '../../types/db';

const database = db as unknown as Database;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const tasks = await database.tasks.findMany({
          orderBy: { date: 'asc' }
        });
        res.status(200).json(tasks);
        break;

      case 'POST':
        const taskData = req.body;
        const task = await database.tasks.create({
          data: taskData
        });
        res.status(201).json(task);
        break;

      case 'PUT':
        const { id, ...updateData } = req.body;
        const updatedTask = await database.tasks.update({
          where: { id },
          data: updateData
        });
        res.status(200).json(updatedTask);
        break;

      case 'DELETE':
        const { id: taskId } = req.query;
        await database.tasks.delete({
          where: { id: taskId as string }
        });
        res.status(200).json({ message: 'Task deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Tasks API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}