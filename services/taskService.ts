
import { Task, TaskStatus, TaskFormData } from '../types';

const STORAGE_KEY = 'voxtask_data';

export const taskService = {
  getTasks: async (): Promise<Task[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  createTask: async (data: TaskFormData): Promise<Task> => {
    const tasks = await taskService.getTasks();
    const newTask: Task = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    tasks.push(newTask);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return newTask;
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const tasks = await taskService.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    
    tasks[index] = { ...tasks[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return tasks[index];
  },

  deleteTask: async (id: string): Promise<void> => {
    const tasks = await taskService.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};
