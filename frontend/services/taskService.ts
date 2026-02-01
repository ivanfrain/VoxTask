import { Task, TaskStatus, TaskFormData, User } from '../types';

const API_BASE_URL = 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'voxtask_auth_token';
const USER_DATA_KEY = 'voxtask_current_user';

let authToken: string | null = localStorage.getItem(AUTH_TOKEN_KEY);
let currentUserId: string | null = null;

const getStorageKey = (key: string) => currentUserId ? `voxtask_${currentUserId}_${key}` : `voxtask_anon_${key}`;

const getLocalTasks = (): Task[] => {
  const data = localStorage.getItem(getStorageKey('local_backup'));
  return data ? JSON.parse(data) : [];
};

const saveLocalTasks = (tasks: Task[]) => {
  localStorage.setItem(getStorageKey('local_backup'), JSON.stringify(tasks));
};

const getSyncQueue = (): SyncAction[] => {
  const data = localStorage.getItem(getStorageKey('sync_queue'));
  return data ? JSON.parse(data) : [];
};

const saveSyncQueue = (queue: SyncAction[]) => {
  localStorage.setItem(getStorageKey('sync_queue'), JSON.stringify(queue));
};

interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  tempId?: string;
  targetId?: string;
  payload?: any;
  timestamp: number;
}

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 3000) {
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, headers, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const taskService = {
  isBackendAvailable: false,
  isSyncing: false,

  initUser: (user: User | null) => {
    currentUserId = user?.id || null;
    if (user) {
      authToken = user.id;
      localStorage.setItem(AUTH_TOKEN_KEY, user.id);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    } else {
      authToken = null;
      currentUserId = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    }
  },

  setToken: (token: string | null) => {
    authToken = token;
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  registerWithEmail: async (email: string, password: string, name: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    const user = await response.json();
    taskService.initUser(user);
    return user;
  },

  loginWithEmail: async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    const user = await response.json();
    taskService.initUser(user);
    return user;
  },

  syncUser: async (userData: any): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const syncedUser = await response.json();
    taskService.initUser(syncedUser);
    return syncedUser;
  },

  upgradeTier: async (): Promise<User> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/users/upgrade`, {
      method: 'POST'
    });
    const updatedUser = await response.json();
    taskService.initUser(updatedUser);
    return updatedUser;
  },

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
      saveLocalTasks(remoteTasks);
      return remoteTasks;
    } catch (error) {
      taskService.isBackendAvailable = false;
      return getLocalTasks();
    }
  },

  createTask: async (data: TaskFormData): Promise<Task> => {
    const tempId = `local-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
      ...data,
      id: tempId,
      createdAt: Date.now() / 1000,
      owner_id: currentUserId || undefined
    };

    const local = getLocalTasks();
    saveLocalTasks([...local, newTask]);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        if (response.status === 403) throw new Error('Upgrade required');
        throw new Error('Create failed');
      }
      const serverTask = await response.json();
      const updatedLocal = getLocalTasks().map(t => t.id === tempId ? serverTask : t);
      saveLocalTasks(updatedLocal);
      return serverTask;
    } catch (error: any) {
      if (error.message === 'Upgrade required') throw error;
      taskService.isBackendAvailable = false;
      const queue = getSyncQueue();
      queue.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'CREATE',
        tempId: tempId,
        payload: data,
        timestamp: Date.now()
      });
      saveSyncQueue(queue);
      return newTask;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const local = getLocalTasks();
    const updatedTasks = local.map(t => t.id === id ? { ...t, ...updates } : t);
    saveLocalTasks(updatedTasks);
    const updatedTask = updatedTasks.find(t => t.id === id)!;

    try {
      if (id.startsWith('local-')) throw new Error('Wait for sync');
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Update failed');
      return await response.json();
    } catch (error) {
      taskService.isBackendAvailable = false;
      const queue = getSyncQueue();
      queue.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'UPDATE',
        targetId: id,
        payload: updates,
        timestamp: Date.now()
      });
      saveSyncQueue(queue);
      return updatedTask;
    }
  },

  deleteTask: async (id: string): Promise<void> => {
    const local = getLocalTasks();
    saveLocalTasks(local.filter(t => t.id !== id));

    try {
      if (id.startsWith('local-')) {
        const queue = getSyncQueue().filter(q => q.tempId !== id);
        saveSyncQueue(queue);
        return;
      }
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
    } catch (error) {
      taskService.isBackendAvailable = false;
      const queue = getSyncQueue();
      queue.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'DELETE',
        targetId: id,
        timestamp: Date.now()
      });
      saveSyncQueue(queue);
    }
  },

  processSyncQueue: async (): Promise<void> => {
    if (taskService.isSyncing) return;
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    taskService.isSyncing = true;
    const processedIds: string[] = [];
    const idMap: Record<string, string> = {};

    for (const action of queue) {
      try {
        if (action.type === 'CREATE') {
          const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(action.payload),
          });
          if (response.ok) {
            const serverTask = await response.json();
            if (action.tempId) idMap[action.tempId] = serverTask.id;
            processedIds.push(action.id);
          } else if (response.status === 403) {
            break;
          }
        } else if (action.type === 'UPDATE') {
          const finalId = idMap[action.targetId!] || action.targetId;
          if (finalId?.startsWith('local-')) continue;
          const response = await fetch(`${API_BASE_URL}/tasks/${finalId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(action.payload),
          });
          if (response.ok) processedIds.push(action.id);
        } else if (action.type === 'DELETE') {
          const finalId = idMap[action.targetId!] || action.targetId;
          const response = await fetch(`${API_BASE_URL}/tasks/${finalId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (response.ok || response.status === 404) processedIds.push(action.id);
        }
      } catch (err) {
        break;
      }
    }

    const remainingQueue = getSyncQueue().filter(q => !processedIds.includes(q.id));
    saveSyncQueue(remainingQueue);
    taskService.isSyncing = false;
  }
};