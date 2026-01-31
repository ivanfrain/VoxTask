
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

  const categories = [
    { label: 'To Do', value: TaskStatus.TODO, icon: 'fa-clipboard-list' },
    { label: 'In Progress', value: TaskStatus.IN_PROGRESS, icon: 'fa-spinner' },
    { label: 'On Hold', value: TaskStatus.ON_HOLD, icon: 'fa-circle-pause' },
    { label: 'Done', value: TaskStatus.DONE, icon: 'fa-check-circle' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col z-50 carplay-gradient select-none overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="flex h-full">
        <aside className="w-24 border-r border-white/10 flex flex-col items-center py-6 gap-6 bg-black/30">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-xl mb-4">
            <i className="fa-solid fa-layer-group text-xl"></i>
          </div>
          
          {categories.map(cat => (
            <button 
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${selectedCategory === cat.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <i className={`fa-solid ${cat.icon} text-lg`}></i>
              <span className="text-[9px] font-bold uppercase">{cat.label.split(' ')[0]}</span>
            </button>
          ))}

          <div className="mt-auto flex flex-col gap-6 items-center">
            <button onClick={onRefresh} className="text-slate-400 hover:text-white transition-colors">
              <i className="fa-solid fa-rotate text-xl"></i>
            </button>
            <button 
              onClick={onExit}
              className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-90"
            >
              <i className="fa-solid fa-power-off text-xl"></i>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-black/10">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}</h1>
              <p className="text-slate-400 text-sm font-medium">{filteredTasks.length} tasks identified</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-right">
                 <p className="text-2xl font-medium tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                <i className="fa-solid fa-ghost text-5xl"></i>
                <p className="text-xl font-medium tracking-tight">No tasks in this list</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-6 hover:bg-white/10 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate group-hover:text-blue-400 transition-colors">{task.title}</h3>
                    <p className="text-slate-400 truncate text-sm mt-1">{task.description}</p>
                    <div className="flex gap-2 mt-3">
                      {task.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/30">{tag}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {task.status !== TaskStatus.DONE && (
                      <button 
                        onClick={() => onStatusChange(task.id, { status: TaskStatus.DONE })}
                        className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-transform active:scale-90"
                        title="Mark Done"
                      >
                        <i className="fa-solid fa-check text-xl"></i>
                      </button>
                    )}
                    {task.status === TaskStatus.TODO && (
                      <button 
                        onClick={() => onStatusChange(task.id, { status: TaskStatus.IN_PROGRESS })}
                        className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-90"
                        title="Start Task"
                      >
                        <i className="fa-solid fa-play text-xl"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-8 py-6 bg-black/40 border-t border-white/5 text-center">
             <p className="text-slate-500 text-sm font-medium">Use the voice assistant button on the dashboard for eyes-free task creation.</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CarPlayView;
