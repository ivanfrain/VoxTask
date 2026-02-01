
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
        <button onClick={onExit} className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-power-off text-xl"></i></button>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-8 py-6 border-b border-white/5 bg-black/10 flex justify-between">
          <h1 className="text-2xl font-bold">{selectedCategory.toUpperCase()}</h1>
          <button onClick={onRefresh}><i className="fa-solid fa-rotate"></i></button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold">{task.title}</h3>
                <p className="text-slate-400 text-sm">{task.description}</p>
              </div>
              <button onClick={() => onStatusChange(task.id, { status: TaskStatus.DONE })} className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-check"></i></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CarPlayView;
