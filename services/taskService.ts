
import { Task, TaskStatus, TaskFormData } from '../types';

const API_BASE_URL = 'http://localhost:8000';
const LOCAL_STORAGE_KEY = 'voxtask_local_backup';

// Internal helper for local storage
const getLocalTasks = (): Task[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalTasks = (tasks: Task[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
};

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const taskService = {
  isBackendAvailable: false,

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/health`, { method: 'GET' }, 1500);
      taskService.isBackendAvailable = response.ok;
      return response.ok;
    } catch {
      taskService.isBackendAvailable = false;
      return false;
    }
  },

  getTasks: async (): Promise<Task[]> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`);
      if (!response.ok) throw new Error('Backend responded with error');
      
      const remoteTasks = await response.json();
      taskService.isBackendAvailable = true;
      // Update local cache to match remote
      saveLocalTasks(remoteTasks);
      return remoteTasks;
    } catch (error) {
      console.warn('Backend unreachable, using local storage fallback.', error);
      taskService.isBackendAvailable = false;
      return getLocalTasks();
    }
  },

  createTask: async (data: TaskFormData): Promise<Task> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Create failed');
      
      const newTask = await response.json();
      const local = getLocalTasks();
      saveLocalTasks([...local, newTask]);
      return newTask;
    } catch (error) {
      taskService.isBackendAvailable = false;
      // Create locally
      const newTask: Task = {
        ...data,
        id: `local-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now() / 1000
      };
      const local = getLocalTasks();
      saveLocalTasks([...local, newTask]);
      return newTask;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      // Don't even try if we know it's a local-only task (starts with local-)
      if (id.startsWith('local-')) throw new Error('Local task');

      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Update failed');
      
      const updated = await response.json();
      const local = getLocalTasks();
      saveLocalTasks(local.map(t => t.id === id ? updated : t));
      return updated;
    } catch (error) {
      const local = getLocalTasks();
      const updatedTasks = local.map(t => t.id === id ? { ...t, ...updates } : t);
      saveLocalTasks(updatedTasks);
      return updatedTasks.find(t => t.id === id)!;
    }
  },

  deleteTask: async (id: string): Promise<void> => {
    try {
      if (!id.startsWith('local-')) {
        await fetchWithTimeout(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.warn('Backend delete failed, performing local delete only.');
    } finally {
      const local = getLocalTasks();
      saveLocalTasks(local.filter(t => t.id !== id));
    }
  }
};
