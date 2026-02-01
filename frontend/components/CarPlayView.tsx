
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';

interface CarPlayViewProps {
  tasks: Task[];
  onExit: () => void;
  onStatusChange: (id: string, updates: Partial<Task>) => void;
  onRefresh: () => void;
}

const CarPlayView: React.FC<CarPlayViewProps> = ({ tasks, onExit, onStatusChange, onRefresh }) => {
  const [selectedCategory, setSelectedCategory] = useState<TaskStatus>(TaskStatus.TODO);
  const filteredTasks = tasks.filter(t => t.status === selectedCategory);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex z-50 carplay-gradient select-none">
      <aside className="w-24 border-r border-white/10 flex flex-col items-center py-6 gap-6 bg-black/30">
        <button onClick={onExit} className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg hover:bg-red-700 active:scale-95 transition-all">
          <i className="fa-solid fa-power-off text-xl"></i>
        </button>
        
        <nav className="flex flex-col gap-4 mt-10">
          {Object.values(TaskStatus).map((status) => (
            <button 
              key={status}
              onClick={() => setSelectedCategory(status)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${selectedCategory === status ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
            >
              <i className={`fa-solid ${
                status === TaskStatus.TODO ? 'fa-list' : 
                status === TaskStatus.IN_PROGRESS ? 'fa-spinner' : 
                status === TaskStatus.ON_HOLD ? 'fa-pause' : 'fa-check-double'
              }`}></i>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-8 py-6 border-b border-white/5 bg-black/10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">{selectedCategory.toUpperCase()}</h1>
            <p className="text-slate-500 text-xs mt-1">VoxTask CarPlay Interface</p>
          </div>
          <button 
            onClick={onRefresh}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:rotate-180 transition-all duration-500"
          >
            <i className="fa-solid fa-rotate"></i>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20">
              <i className="fa-solid fa-folder-open text-6xl mb-4"></i>
              <p className="text-xl font-medium">No tasks in this category</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isUnsynced = task.id.startsWith('local-');
              return (
                <div key={task.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-6 group hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{task.title}</h3>
                      {isUnsynced && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-1">{task.description || 'No description'}</p>
                  </div>
                  <button 
                    onClick={() => onStatusChange(task.id, { status: TaskStatus.DONE })} 
                    className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <i className="fa-solid fa-check text-xl"></i>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default CarPlayView;
