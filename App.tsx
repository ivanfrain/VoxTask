
import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from './types';
import { taskService } from './services/taskService';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import VoiceAssistant from './components/VoiceAssistant';
import CarPlayView from './components/CarPlayView';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isCarMode, setIsCarMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (formData: any) => {
    await taskService.createTask(formData);
    fetchTasks();
    setIsFormOpen(false);
  };

  const handleUpdateTask = async (id: string, updates: any) => {
    await taskService.updateTask(id, updates);
    fetchTasks();
    setEditingTask(undefined);
    setIsFormOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    await taskService.deleteTask(id);
    fetchTasks();
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  if (isCarMode) {
    return (
      <CarPlayView 
        tasks={tasks} 
        onExit={() => setIsCarMode(false)}
        onStatusChange={handleUpdateTask}
        onRefresh={fetchTasks}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <i className="fa-solid fa-check-double text-sm"></i>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">VoxTask<span className="text-blue-600">Pro</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCarMode(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <i className="fa-solid fa-car"></i>
              Car Mode
            </button>
            <button 
              onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Synchronizing your tasks...</p>
          </div>
        ) : (
          <TaskBoard 
            tasks={tasks} 
            onDelete={handleDeleteTask} 
            onEdit={handleEditClick}
            onStatusChange={handleUpdateTask}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 md:hidden z-40">
        <button 
          onClick={() => setIsCarMode(true)}
          className="w-12 h-12 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center text-xl"
        >
          <i className="fa-solid fa-car"></i>
        </button>
      </div>

      {/* Voice Assistant Overlay */}
      <VoiceAssistant onTaskCreated={fetchTasks} />

      {/* Modals */}
      {isFormOpen && (
        <TaskForm 
          task={editingTask}
          onSubmit={editingTask ? (data) => handleUpdateTask(editingTask.id, data) : handleCreateTask}
          onClose={() => { setIsFormOpen(false); setEditingTask(undefined); }}
        />
      )}
    </div>
  );
};

export default App;
