
import { Task, TaskStatus, TaskFormData } from '../types';

const API_BASE_URL = 'http://localhost:8000';
const LOCAL_STORAGE_KEY = 'voxtask_local_backup';
const SYNC_QUEUE_KEY = 'voxtask_sync_queue';

interface SyncAction {
  id: string; // Internal tracking ID
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  tempId?: string; // For CREATE actions, to map back after server response
  targetId?: string; // The ID of the task being acted upon
  payload?: any;
  timestamp: number;
}

const getLocalTasks = (): Task[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalTasks = (tasks: Task[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
};

const getSyncQueue = (): SyncAction[] => {
  const data = localStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveSyncQueue = (queue: SyncAction[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
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
      createdAt: Date.now() / 1000
    };

    // Optimistic Update
    const local = getLocalTasks();
    saveLocalTasks([...local, newTask]);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Create failed');
      const serverTask = await response.json();
      
      // Replace local task with server version (real ID)
      const updatedLocal = getLocalTasks().map(t => t.id === tempId ? serverTask : t);
      saveLocalTasks(updatedLocal);
      return serverTask;
    } catch (error) {
      taskService.isBackendAvailable = false;
      // Queue for later
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
    // Optimistic Update
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
    // Optimistic Update
    const local = getLocalTasks();
    saveLocalTasks(local.filter(t => t.id !== id));

    try {
      if (id.startsWith('local-')) {
        // Just remove from local queue if it was a pending CREATE
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
    console.log(`[Sync] Processing ${queue.length} pending actions...`);

    const processedIds: string[] = [];
    const idMap: Record<string, string> = {};

    for (const action of queue) {
      try {
        if (action.type === 'CREATE') {
          const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          });
          if (response.ok) {
            const serverTask = await response.json();
            if (action.tempId) idMap[action.tempId] = serverTask.id;
            processedIds.push(action.id);
          }
        } else if (action.type === 'UPDATE') {
          // If the targetId was a tempId from a previous CREATE in this session
          const finalId = idMap[action.targetId!] || action.targetId;
          if (finalId?.startsWith('local-')) {
             // Still local? Skip update until next sync pass or ignore if parent create failed
             continue;
          }
          const response = await fetch(`${API_BASE_URL}/tasks/${finalId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          });
          if (response.ok) processedIds.push(action.id);
        } else if (action.type === 'DELETE') {
          const finalId = idMap[action.targetId!] || action.targetId;
          if (finalId?.startsWith('local-')) {
            processedIds.push(action.id);
            continue;
          }
          const response = await fetch(`${API_BASE_URL}/tasks/${finalId}`, { method: 'DELETE' });
          if (response.ok || response.status === 404) processedIds.push(action.id);
        }
      } catch (err) {
        console.error('[Sync] Action failed:', action, err);
        break; // Stop replaying if backend goes down again
      }
    }

    const remainingQueue = getSyncQueue().filter(q => !processedIds.includes(q.id));
    saveSyncQueue(remainingQueue);
    taskService.isSyncing = false;
    console.log(`[Sync] Finished. Remaining in queue: ${remainingQueue.length}`);
  }
};
