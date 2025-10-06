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
            t.status,
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
          date: formatDate(row.date),
          startTime: formatTime(row.start_time),
          endTime: formatTime(row.end_time),
          priority: row.priority,
          description: row.description,
          completed: row.completed,
          status: row.status || 'pending',
          createdBy: row.created_by,
          createdAt: row.created_at,
          employees: row.employees,
          employeeIds: (row.employees || []).filter((emp: any) => emp && emp.id).map((emp: any) => emp.id)
        }));

        console.log(`Found ${tasks.length} tasks`);
        res.status(200).json(tasks);
        break;

      case 'POST':
        console.log('Creating task:', req.body);
        const { id, title, date, startTime, endTime, priority, description, completed, status, createdBy, employeeIds } = req.body;
        
        if (!title || !title.trim() || !employeeIds || employeeIds.length === 0) {
          return res.status(400).json({ error: 'Title and at least one employee are required' });
        }

        await pool.query('BEGIN');
        
        const createdTasks = [];
        
        // Создаем отдельную задачу для каждого сотрудника
        for (let i = 0; i < employeeIds.length; i++) {
          const employeeId = employeeIds[i];
          const taskId = i === 0 ? id : `${id}_${i}`; // Уникальный ID для каждой копии
          
          const taskResult = await pool.query(
            `INSERT INTO tasks (id, title, date, start_time, end_time, priority, description, completed, status, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [taskId, title.trim(), date, startTime, endTime, priority, description || '', completed || false, status || 'pending', createdBy]
          );

          await pool.query(
            'INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)',
            [taskId, employeeId]
          );

          // Добавляем employee_id в результат
          const taskWithEmployee = {
            ...taskResult.rows[0],
            employee_id: employeeId
          };

          createdTasks.push(taskWithEmployee);
        }

        await pool.query('COMMIT');

        // Возвращаем все созданные задачи
        res.status(201).json(createdTasks);
        break;

      case 'PUT':
        console.log('Updating task:', req.body);
        const { id: updateId, title: updateTitle, date: updateDate, startTime: updateStartTime, 
                endTime: updateEndTime, priority: updatePriority, description: updateDescription, 
                completed: updateCompleted, status: updateStatus, employeeIds: updateEmployeeIds } = req.body;
        
        await pool.query('BEGIN');

        await pool.query(
          `UPDATE tasks SET title = $1, date = $2, start_time = $3, end_time = $4, 
           priority = $5, description = $6, completed = $7, status = $8 WHERE id = $9`,
          [updateTitle, updateDate, updateStartTime, updateEndTime, updatePriority, 
           updateDescription, updateCompleted, updateStatus || 'pending', updateId]
        );

        if (updateEmployeeIds) {
          await pool.query('DELETE FROM task_assignments WHERE task_id = $1', [updateId]);
          for (const employeeId of updateEmployeeIds) {
            await pool.query(
              'INSERT INTO task_assignments (task_id, employee_id) VALUES ($1, $2)',
              [updateId, employeeId]
            );
          }
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