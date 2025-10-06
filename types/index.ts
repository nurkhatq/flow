export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Employee {
  id: string;
  name: string;
  position: string;
  avatar: string;
  color: string;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  employeeIds: string[];
  employees?: Employee[];
  date: string;
  startTime: string;
  endTime: string;
  priority: TaskPriority;
  description: string;
  completed: boolean;
  status?: TaskStatus;
  createdBy?: string;
  created_at?: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  duration: number;
  priority: TaskPriority;
  created_at?: string;
}

export interface Notification {
  id: string;
  employeeId: string;
  taskId: string;
  message: string;
  read: boolean;
  created_at?: string;
}

export interface TaskFormData {
  title: string;
  employeeIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  priority: TaskPriority;
  description: string;
  completed: boolean;
  status?: TaskStatus;
}

export const TASK_STATUSES = {
  pending: { 
    label: 'Ожидает', 
    color: '#9CA3AF', 
    bg: 'bg-gray-100', 
    text: 'text-gray-700',
    icon: '⏸️'
  },
  in_progress: { 
    label: 'В работе', 
    color: '#3B82F6', 
    bg: 'bg-blue-100', 
    text: 'text-blue-700',
    icon: '▶️'
  },
  completed: { 
    label: 'Выполнена', 
    color: '#10B981', 
    bg: 'bg-green-100', 
    text: 'text-green-700',
    icon: '✅'
  }
};

export interface TemplateFormData {
  title: string;
  description: string;
  duration: number;
  priority: TaskPriority;
}

export const PRIORITY_COLORS = {
  low: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700', color: '#10B981' },
  medium: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700', color: '#F59E0B' },
  high: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700', color: '#F97316' },
  urgent: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700', color: '#EF4444' }
};

export const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
];

export const DURATION_PRESETS = [
  { label: '15 мин', value: 15 },
  { label: '30 мин', value: 30 },
  { label: '45 мин', value: 45 },
  { label: '1 час', value: 60 },
  { label: '1.5 часа', value: 90 },
  { label: '2 часа', value: 120 },
  { label: '3 часа', value: 180 },
  { label: '4 часа', value: 240 }
];