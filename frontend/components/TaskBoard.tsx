
import React from 'react';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, updates: Partial<Task>) => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onDelete, onEdit, onStatusChange }) => {
  const columns: { title: string; status: TaskStatus; icon: string; color: string }[] = [
    { title: 'To Do', status: TaskStatus.TODO, icon: 'fa-clipboard-list', color: 'bg-slate-100 text-slate-600' },
    { title: 'In Progress', status: TaskStatus.IN_PROGRESS, icon: 'fa-spinner', color: 'bg-blue-50 text-blue-600' },
    { title: 'On Hold', status: TaskStatus.ON_HOLD, icon: 'fa-circle-pause', color: 'bg-amber-50 text-amber-600' },
    { title: 'Done', status: TaskStatus.DONE, icon: 'fa-check-circle', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${col.color}`}>
                  <i className={`fa-solid ${col.icon}`}></i>
                </span>
                <h3 className="font-semibold text-slate-700">{col.title}</h3>
                <span className="text-slate-400 text-sm font-medium ml-1">({colTasks.length})</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 min-h-[200px] p-2 rounded-xl bg-slate-50/50 border border-slate-100">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <p className="text-sm font-medium">No tasks here</p>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onDelete={onDelete} 
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskBoard;
