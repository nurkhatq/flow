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

  console.log(`Tasks API: ${method} request`);

  // Функция для форматирования даты в YYYY-MM-DD
  const formatDate = (date: any) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Функция для форматирования времени HH:MM:SS -> HH:MM
  const formatTime = (time: string) => {
    if (!time) return null;
    return time.substring(0, 5); // Обрезаем секунды
  };

  try {
    switch (method) {
      case 'GET':
        console.log('Fetching tasks...');
        const result = await pool.query(`
          SELECT 
            t.id,
            t.title,
            t.date,
            t.start_time,
            t.end_time,
            t.priority,
            t.description,
            t.completed,
            t.created_by,
            t.created_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'position', e.position,
                  'avatar', e.avatar,
                  'color', e.color
                )
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) as employees
          FROM tasks t
          LEFT JOIN task_assignments ta ON t.id = ta.task_id
          LEFT JOIN employees e ON ta.employee_id = e.id
          GROUP BY t.id
          ORDER BY t.date, t.start_time
        `);
        
        const tasks = result.rows.map(row => ({
          id: row.id,
          title: row.title,
          date: formatDate(row.date), // ← ФОРМАТИРУЕМ ДАТУ
          startTime: formatTime(row.start_time), // ← ФОРМАТИРУЕМ ВРЕМЯ
          endTime: formatTime(row.end_time), // ← ФОРМАТИРУЕМ ВРЕМЯ
          priority: row.priority,
          description: row.description,
          completed: row.completed,
          createdBy: row.created_by,
          createdAt: row.created_at,
          employees: row.employees,
          employeeIds: row.employees.map((emp: any) => emp.id)
        }));

        console.log(`Found ${tasks.length} tasks`);
        console.log('Sample task:', tasks[0]); // Для отладки
        res.status(200).json(tasks);
        break;

      case 'POST':
        console.log('Creating task:', req.body);
        const { id, title, date, startTime, endTime, priority, description, completed, createdBy, employeeIds } = req.body;
        
        if (!title || !title.trim() || !employeeIds || employeeIds.length === 0) {
          return res.status(400).json({ error: 'Title and at least one employee are required' });
        }

        await pool.query('BEGIN');
        
        const taskResult = await pool.query(
          `INSERT INTO tasks (id, title, date, start_time, end_time, priority, description, completed, created_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [id, title.trim(), date, startTime, endTime, priority, description || '', completed || false, createdBy]
        );

        for (const employeeId of employeeIds) {
          await pool.query(
            'INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)',
            [id, employeeId]
          );
        }

        await pool.query('COMMIT');

        // Получаем полную задачу с сотрудниками
        const fullTaskResult = await pool.query(`
          SELECT 
            t.id,
            t.title,
            t.date,
            t.start_time,
            t.end_time,
            t.priority,
            t.description,
            t.completed,
            t.created_by,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'position', e.position,
                  'avatar', e.avatar,
                  'color', e.color
                )
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) as employees
          FROM tasks t
          LEFT JOIN task_assignments ta ON t.id = ta.task_id
          LEFT JOIN employees e ON ta.employee_id = e.id
          WHERE t.id = $1
          GROUP BY t.id
        `, [id]);

        const newTask = {
          id: fullTaskResult.rows[0].id,
          title: fullTaskResult.rows[0].title,
          date: formatDate(fullTaskResult.rows[0].date), // ← ФОРМАТИРУЕМ
          startTime: formatTime(fullTaskResult.rows[0].start_time), // ← ФОРМАТИРУЕМ
          endTime: formatTime(fullTaskResult.rows[0].end_time), // ← ФОРМАТИРУЕМ
          priority: fullTaskResult.rows[0].priority,
          description: fullTaskResult.rows[0].description,
          completed: fullTaskResult.rows[0].completed,
          createdBy: fullTaskResult.rows[0].created_by,
          employees: fullTaskResult.rows[0].employees,
          employeeIds: fullTaskResult.rows[0].employees.map((emp: any) => emp.id)
        };

        console.log('Task created:', newTask);
        res.status(201).json(newTask);
        break;

      case 'PUT':
        console.log('Updating task:', req.body);
        const { id: updateId, title: updateTitle, date: updateDate, startTime: updateStartTime, 
                endTime: updateEndTime, priority: updatePriority, description: updateDescription, 
                completed: updateCompleted, employeeIds: updateEmployeeIds } = req.body;
        
        await pool.query('BEGIN');

        await pool.query(
          `UPDATE tasks SET title = $1, date = $2, start_time = $3, end_time = $4, 
           priority = $5, description = $6, completed = $7 WHERE id = $8`,
          [updateTitle, updateDate, updateStartTime, updateEndTime, updatePriority, 
           updateDescription, updateCompleted, updateId]
        );

        await pool.query('DELETE FROM task_assignments WHERE task_id = $1', [updateId]);
        for (const employeeId of updateEmployeeIds) {
          await pool.query(
            'INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)',
            [updateId, employeeId]
          );
        }

        await pool.query('COMMIT');
        res.status(200).json({ message: 'Task updated successfully' });
        break;

      case 'DELETE':
        const { id: taskId } = req.query;
        console.log('Deleting task:', taskId);
        
        if (!taskId || Array.isArray(taskId)) {
          return res.status(400).json({ error: 'Valid ID is required' });
        }

        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
        res.status(200).json({ message: 'Task deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Tasks API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
}