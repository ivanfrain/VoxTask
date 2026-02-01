
import React from 'react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, updates: Partial<Task>) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete, onEdit, onStatusChange }) => {
  const isUnsynced = task.id.startsWith('local-');

  const getStatusAction = () => {
    switch (task.status) {
      case TaskStatus.TODO:
        return { label: 'Start', status: TaskStatus.IN_PROGRESS, icon: 'fa-play' };
      case TaskStatus.IN_PROGRESS:
        return { label: 'Hold', status: TaskStatus.ON_HOLD, icon: 'fa-pause' };
      case TaskStatus.ON_HOLD:
        return { label: 'Resume', status: TaskStatus.IN_PROGRESS, icon: 'fa-play' };
      default:
        return null;
    }
  };

  const nextAction = getStatusAction();

  return (
    <div className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
            {task.title}
          </h4>
          {isUnsynced ? (
            <span title="En attente de synchronisation" className="text-amber-500 flex items-center">
              <i className="fa-solid fa-cloud-arrow-up text-[10px] animate-pulse"></i>
            </span>
          ) : (
            <span title="Synchronisé avec le cloud" className="text-emerald-500 flex items-center">
              <i className="fa-solid fa-cloud text-[10px]"></i>
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <i className="fa-solid fa-pen text-xs"></i>
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <i className="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </div>
      <p className="text-slate-500 text-sm line-clamp-2 mb-4">{task.description || 'No description provided.'}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {task.tags.map((tag, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-400">
          <i className="fa-regular fa-calendar text-xs"></i>
          <span className="text-xs font-medium">{new Date(task.deadline).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          {nextAction && (
            <button onClick={() => onStatusChange(task.id, { status: nextAction.status })} className="text-[10px] font-bold uppercase tracking-wide px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
              <i className={`fa-solid ${nextAction.icon}`}></i> {nextAction.label}
            </button>
          )}
          {task.status !== TaskStatus.DONE && (
            <button onClick={() => onStatusChange(task.id, { status: TaskStatus.DONE })} className="text-[10px] font-bold uppercase tracking-wide px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1">
              <i className="fa-solid fa-check"></i> Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
