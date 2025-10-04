import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';
import { Database } from '../../types/db';

const database = db as unknown as Database;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const templates = await database.templates.findMany();
        res.status(200).json(templates);
        break;

      case 'POST':
        const templateData = req.body;
        const template = await database.templates.create({
          data: templateData,
        });
        res.status(201).json(template);
        break;

      case 'PUT':
        const { id, ...updateData } = req.body;
        const updatedTemplate = await database.templates.update({
          where: { id },
          data: updateData,
        });
        res.status(200).json(updatedTemplate);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        await database.templates.delete({
          where: { id: deleteId as string },
        });
        res.status(200).json({ message: 'Template deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Templates API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}