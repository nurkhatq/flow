import React, { useState, useEffect, MouseEvent } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Bell, Users, LogOut, Bookmark, TrendingUp, Copy, Edit2, Trash2, Clock } from 'lucide-react';
import { 
  Employee, 
  Task, 
  Template, 
  Notification, 
  TaskFormData, 
  TemplateFormData,
  PRIORITY_COLORS,
  COLORS,
  DURATION_PRESETS 
} from '../types';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const TeamFlow = () => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateListModal, setShowTemplateListModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    employeeIds: [],
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    priority: 'medium',
    description: '',
    completed: false
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    position: ''
  });
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    title: '',
    description: '',
    duration: 60,
    priority: 'medium'
  });

  // Загрузка данных
  useEffect(() => {
    fetchEmployees();
    fetchTasks();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications(currentUser.id);
    }
  }, [currentUser]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchNotifications = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/notifications?employeeId=${employeeId}`);
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const generateAvatar = (name: string): string => {
    const parts = name.trim().split(' ');
    const initials = parts.length > 1 
      ? parts[0][0] + parts[1][0] 
      : parts[0].substring(0, 2);
    return initials.toUpperCase();
  };

  const getEmployeeColor = (index: number): string => {
    return COLORS[index % COLORS.length];
  };

  const addEmployee = async () => {
    if (!employeeForm.name.trim()) return;
    
    const newEmployee = {
      id: Date.now().toString(),
      name: employeeForm.name,
      position: employeeForm.position || 'Сотрудник',
      avatar: generateAvatar(employeeForm.name),
      color: getEmployeeColor(employees.length)
    };
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });
      const savedEmployee = await response.json();
      
      setEmployees([...employees, savedEmployee]);
      setEmployeeForm({ name: '', position: '' });
      setShowEmployeeModal(false);
      
      if (!currentUser) {
        setCurrentUser(savedEmployee);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      setEmployees(employees.filter(e => e.id !== id));
      setTasks(tasks.filter(t => !t.employeeIds.includes(id)));
      if (selectedEmployee === id) setSelectedEmployee('all');
      if (currentUser?.id === id) setCurrentUser(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const addTask = async () => {
    if (!taskForm.title.trim() || taskForm.employeeIds.length === 0) return;
    
    const taskData = {
      id: editingTask ? editingTask.id : Date.now().toString(),
      ...taskForm,
      createdBy: currentUser?.id
    };
    
    try {
      const url = '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (editingTask) {
        await response.json();
        // Обновляем локальное состояние
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...taskData, id: editingTask.id } : t));
      } else {
        const newTask = await response.json();
        setTasks([...tasks, newTask]);
        
        // Создаем уведомления
        for (const employeeId of taskForm.employeeIds) {
          if (employeeId !== currentUser?.id) {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: Date.now().toString() + employeeId,
                employeeId: employeeId,
                taskId: newTask.id,
                message: `${currentUser?.name} назначил вам задачу: ${taskForm.title}`
              })
            });
          }
        }
      }
      
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      employeeIds: currentUser ? [currentUser.id] : [],
      date: formatDate(new Date()),
      startTime: '09:00',
      endTime: '10:00',
      priority: 'medium',
      description: '',
      completed: false
    });
  };

  const openTaskModal = (task: Task | null = null, date?: Date, startTime?: string, employeeId?: string) => {
    if (task) {
      setEditingTask(task);
      setTaskForm(task);
    } else {
      resetTaskForm();
      if (date) {
        setTaskForm(prev => ({
          ...prev,
          date: formatDate(date),
          startTime: startTime || '09:00',
          endTime: calculateEndTime(startTime || '09:00', 60),
          employeeIds: employeeId ? [employeeId] : prev.employeeIds
        }));
      }
    }
    setShowTaskModal(true);
  };

  const deleteTask = async () => {
    if (editingTask) {
      try {
        await fetch(`/api/tasks?id=${editingTask.id}`, { method: 'DELETE' });
        setTasks(tasks.filter(t => t.id !== editingTask.id));
        setShowTaskModal(false);
        setEditingTask(null);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const addTemplate = async () => {
    if (!templateForm.title.trim()) return;
    
    const templateData = {
      id: editingTemplate ? editingTemplate.id : Date.now().toString(),
      ...templateForm
    };
    
    try {
      const url = '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const savedTemplate = await response.json();
      
      if (editingTemplate) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? savedTemplate : t));
      } else {
        setTemplates([...templates, savedTemplate]);
      }
      
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm({ title: '', description: '', duration: 60, priority: 'medium' });
    } catch (error) {
      console.error('Error adding template:', error);
    }
  };

  const useTemplate = (template: Template) => {
    setTaskForm({
      ...taskForm,
      title: template.title,
      description: template.description,
      priority: template.priority,
      endTime: calculateEndTime(taskForm.startTime, template.duration)
    });
    setShowTemplateListModal(false);
    setShowTaskModal(true);
  };

  const deleteTemplate = async (e: MouseEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault();
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true })
      });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const getEmployeeEfficiency = (employeeId: string) => {
    const employeeTasks = tasks.filter(t => t.employeeIds.includes(employeeId));
    if (employeeTasks.length === 0) return 0;
    const completed = employeeTasks.filter(t => t.completed).length;
    return Math.round((completed / employeeTasks.length) * 100);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDates = (date: Date) => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay() + 1;
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr);
      day.setDate(first + i);
      dates.push(day);
    }
    return dates;
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    
    const dates = [];
    const current = new Date(startDate);
    while (current <= lastDay || dates.length % 7 !== 0) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getTasksForDate = (date: Date, employeeId: string | null = null) => {
    const dateStr = formatDate(date);
    return tasks.filter(t => {
      const matchDate = t.date === dateStr;
      const matchEmployee = employeeId ? t.employeeIds.includes(employeeId) : true;
      return matchDate && matchEmployee;
    });
  };

  const getTaskPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = (hours - 8) * 60 + minutes;
    return (totalMinutes / 30) * 60;
  };

  const getTaskHeight = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    return (duration / 30) * 60;
  };

  const isEmployeeAvailable = (employeeId: string, date: string, startTime: string, endTime: string) => {
    const conflictingTasks = tasks.filter(task => 
      task.employeeIds.includes(employeeId) &&
      task.date === date &&
      task.id !== editingTask?.id &&
      ((startTime >= task.startTime && startTime < task.endTime) ||
       (endTime > task.startTime && endTime <= task.endTime) ||
       (startTime <= task.startTime && endTime >= task.endTime))
    );
    
    return conflictingTasks.length === 0;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Employee Selector Component
  const EmployeeSelector = () => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">Сотрудники *</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {employees.map(employee => {
            const isAvailable = isEmployeeAvailable(
              employee.id, 
              taskForm.date, 
              taskForm.startTime, 
              taskForm.endTime
            );
            
            return (
              <label
                key={employee.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  taskForm.employeeIds.includes(employee.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                } ${
                  !isAvailable ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={taskForm.employeeIds.includes(employee.id)}
                  onChange={(e) => {
                    if (e.target.checked && !isAvailable) return;
                    
                    const newIds = e.target.checked
                      ? [...taskForm.employeeIds, employee.id]
                      : taskForm.employeeIds.filter(id => id !== employee.id);
                    setTaskForm({ ...taskForm, employeeIds: newIds });
                  }}
                  disabled={!isAvailable}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: employee.color }}
                >
                  {employee.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.position}</div>
                </div>
                {!isAvailable && (
                  <div className="text-xs text-red-500">Занят</div>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const startOfWeek = monthDates[0];
    const endOfWeek = monthDates[monthDates.length - 1];

    const monthTasks = tasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    });

    return (
      <div>
        <div className="grid grid-cols-7 gap-4 text-center mb-4">
          {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, index) => (
            <div key={index} className="text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-4">
          {monthDates.map((date, index) => {
            const isToday = formatDate(date) === formatDate(new Date());
            const isSelected = formatDate(date) === taskForm.date;
            const dayTasks = monthTasks.filter(task => task.date === formatDate(date));

            return (
              <div
                key={index}
                onClick={() => setTaskForm({ ...taskForm, date: formatDate(date) })}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isToday ? 'bg-blue-100' : ''
                } ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              >
                <div className="text-sm font-semibold">
                  {date.getDate()}
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-2">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className="text-xs bg-blue-50 text-blue-600 rounded-full px-3 py-1 mr-2 mb-2 inline-block"
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    const dayTasks = getTasksForDate(currentDate, selectedEmployee === 'all' ? null : selectedEmployee);

    return (
      <div>
        <div className="grid grid-cols-4 gap-4 text-center mb-4">
          <div className="text-sm font-medium text-gray-500">Время</div>
          {employees.map(employee => (
            <div key={employee.id} className="text-sm font-medium text-gray-500">
              {employee.name}
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-200">
          {[...Array(24)].map((_, hour) => {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;

            return (
              <div key={hour} className="grid grid-cols-4 gap-4 py-2">
                <div className="text-sm text-gray-500">{timeLabel}</div>
                {employees.map(employee => {
                  const employeeTask = dayTasks.find(task => 
                    task.employeeIds.includes(employee.id) && 
                    task.startTime.startsWith(hour.toString().padStart(2, '0'))
                  );

                  return (
                    <div key={employee.id} className="relative">
                      {employeeTask ? (
                        <div
                          className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm cursor-pointer"
                          style={{
                            gridColumn: `span ${getTaskHeight(employeeTask.startTime, employeeTask.endTime)}`,
                            gridRow: `${getTaskPosition(employeeTask.startTime)} / span ${getTaskHeight(employeeTask.startTime, employeeTask.endTime)}`
                          }}
                          onClick={() => openTaskModal(employeeTask)}
                        >
                          {employeeTask.title}
                        </div>
                      ) : (
                        <div className="h-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Остальной код компонента остается таким же, как в предыдущей версии
  // (рендеринг модальных окон и т.д.)

  // Для экономии места, здесь показаны только ключевые изменения
  // Полный рендеринг компонента можно взять из предыдущего ответа

  if (!currentUser && employees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Calendar className="w-12 h-12 text-blue-600" />
              <h1 className="text-5xl font-bold text-gray-800">TeamFlow</h1>
            </div>
            <p className="text-xl text-gray-600">Выберите свой профиль или создайте новый</p>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Создать нового сотрудника
            </button>
          </div>
        </div>

        {showEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Новый сотрудник</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Имя и фамилия *</label>
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Иван Петров"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Должность</label>
                  <input
                    type="text"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Менеджер"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={addEmployee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Добавить сотрудника
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Calendar className="w-12 h-12 text-blue-600" />
              <h1 className="text-5xl font-bold text-gray-800">TeamFlow</h1>
            </div>
            <p className="text-xl text-gray-600">Выберите свой профиль</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => setCurrentUser(emp)}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer"
              >
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: emp.color }}
                >
                  {emp.avatar}
                </div>
                <h3 className="text-xl font-semibold text-center mb-1">{emp.name}</h3>
                <p className="text-gray-500 text-center">{emp.position}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800">TeamFlow</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="ml-4 font-semibold text-lg">
                  {viewMode === 'month' && currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  {viewMode === 'week' && `${getWeekDates(currentDate)[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${getWeekDates(currentDate)[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {viewMode === 'day' && currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: currentUser?.color }}
                >
                  {currentUser?.avatar}
                </div>
                <span className="font-medium">{currentUser?.name}</span>
              </div>

              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === 'day' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  День
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === 'week' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  Неделя
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === 'month' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  Месяц
                </button>
              </div>

              <button
                onClick={() => setShowTemplateListModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Шаблоны"
              >
                <Bookmark className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Уведомления"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowEmployeeModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Добавить сотрудника"
              >
                <Users className="w-5 h-5" />
              </button>

              <button
                onClick={() => openTaskModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Новая задача
              </button>

              <button
                onClick={() => setCurrentUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Выход"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedEmployee('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedEmployee === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Все сотрудники
            </button>
            {employees.map(emp => {
              const efficiency = getEmployeeEfficiency(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 relative ${
                    selectedEmployee === emp.id 
                      ? 'text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={selectedEmployee === emp.id ? { backgroundColor: emp.color } : {}}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: emp.color }}
                  >
                    {emp.avatar}
                  </div>
                  <span>{emp.name}</span>
                  <span className="text-xs opacity-75">({efficiency}%)</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEmployee(emp.id);
                    }}
                    className="ml-1 p-1 hover:bg-black hover:bg-opacity-20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'month' ? renderMonthView() : renderTimelineView()}
      </div>

      {/* Модальные окна */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingTask ? 'Редактировать задачу' : 'Новая задача'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название задачи *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Введите название"
                  />
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setShowTemplateListModal(true);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    title="Выбрать из шаблонов"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <EmployeeSelector />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Дата *</label>
                  <input
                    type="date"
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Время начала *</label>
                  <input
                    type="time"
                    value={taskForm.startTime}
                    onChange={(e) => setTaskForm({ 
                      ...taskForm, 
                      startTime: e.target.value,
                      endTime: calculateEndTime(e.target.value, 60)
                    })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Время конца *</label>
                  <input
                    type="time"
                    value={taskForm.endTime}
                    onChange={(e) => setTaskForm({ ...taskForm, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Быстрый выбор длительности</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setTaskForm({
                        ...taskForm,
                        endTime: calculateEndTime(taskForm.startTime, preset.value)
                      })}
                      className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Приоритет</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PRIORITY_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setTaskForm({ 
                        ...taskForm, 
                        priority: key as TaskPriority 
                      })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        taskForm.priority === key 
                          ? `${value.border} ${value.bg}` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`font-medium text-sm ${taskForm.priority === key ? value.text : 'text-gray-600'}`}>
                        {key === 'low' && 'Низкий'}
                        {key === 'medium' && 'Средний'}
                        {key === 'high' && 'Высокий'}
                        {key === 'urgent' && 'Срочный'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Добавьте описание задачи"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 gap-3">
              <div>
                {editingTask && (
                  <button
                    onClick={deleteTask}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {editingTask && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskForm.completed}
                      onChange={(e) => setTaskForm({ ...taskForm, completed: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Отметить как выполненную</span>
                  </label>
                )}
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={addTask}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTask ? 'Сохранить' : 'Создать задачу'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно уведомлений */}
      {showNotifications && (
        <div className="fixed right-4 top-20 w-96 bg-white rounded-xl shadow-2xl max-h-[600px] overflow-y-auto z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Уведомления</h3>
          </div>
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Нет новых уведомлений
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-all ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{notification.message}</div>
                    <div className="text-xs text-gray-500">
                      {notification.created_at && new Date(notification.created_at).toLocaleString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t">
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно сотрудников */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Новый сотрудник</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Имя и фамилия *</label>
                <input
                  type="text"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Иван Петров"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Должность</label>
                <input
                  type="text"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Менеджер"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={addEmployee}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Добавить сотрудника
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно списка шаблонов */}
      {showTemplateListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Шаблоны задач</h2>
            
            {templates.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Нет доступных шаблонов
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-100"
                    onClick={() => useTemplate(template)}
                  >
                    <div className="font-medium">{template.title}</div>
                    <div className="text-sm text-gray-500">{template.description}</div>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[template.priority].bg}`}>
                        {template.priority.charAt(0).toUpperCase() + template.priority.slice(1)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                        {template.duration} мин
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowTemplateListModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setShowTemplateListModal(false);
                  setShowTemplateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Создать новый шаблон
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования шаблона */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">
              {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название шаблона *</label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Введите название шаблона"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Добавьте описание шаблона"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Длительность (мин)</label>
                <input
                  type="number"
                  value={templateForm.duration}
                  onChange={(e) => setTemplateForm({ ...templateForm, duration: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Приоритет</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PRIORITY_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setTemplateForm({ 
                        ...templateForm, 
                        priority: key as TaskPriority 
                      })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        templateForm.priority === key 
                          ? `${value.border} ${value.bg}` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`font-medium text-sm ${templateForm.priority === key ? value.text : 'text-gray-600'}`}>
                        {key === 'low' && 'Низкий'}
                        {key === 'medium' && 'Средний'}
                        {key === 'high' && 'Высокий'}
                        {key === 'urgent' && 'Срочный'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 gap-3">
              <div>
                {editingTemplate && (
                  <button
                    onClick={(e) => deleteTemplate(e, editingTemplate.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={addTemplate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTemplate ? 'Сохранить' : 'Создать шаблон'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamFlow;