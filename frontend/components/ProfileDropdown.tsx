
import React, { useState } from 'react';
import { User, SubscriptionTier, Task } from '../types';

interface ProfileDropdownProps {
  user: User;
  tasks: Task[];
  onLogout: () => void;
  onUpgrade: () => void;
  onOpenAdmin?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, tasks, onLogout, onUpgrade, onOpenAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const taskCount = tasks.length;
  const limit = 10;
  const usagePercent = Math.min((taskCount / limit) * 100, 100);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
      >
        <div className="relative">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-slate-200 bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
          )}
          {user.isAdmin && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
              <i className="fa-solid fa-shield text-[6px] text-white"></i>
            </div>
          )}
        </div>
        <i className={`fa-solid fa-chevron-down text-slate-400 text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <p className="font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Usage</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.tier === SubscriptionTier.PRO ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                  {user.tier}
                </span>
              </div>
              
              {user.tier === SubscriptionTier.FREE ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>{taskCount} of {limit} tasks used</span>
                    <span>{Math.round(usagePercent)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>
                  {usagePercent >= 70 && (
                    <p className="text-[10px] text-amber-600 font-medium">Running out of space! Upgrade for more.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-600">
                  <i className="fa-solid fa-infinity text-xs"></i>
                  <span className="text-xs font-bold">Unlimited Tasks Enabled</span>
                </div>
              )}
            </div>
            
            <div className="p-2">
              {user.isAdmin && (
                <button 
                  onClick={() => { onOpenAdmin?.(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mb-1"
                >
                  <i className="fa-solid fa-user-shield text-slate-400"></i>
                  Backoffice Console
                </button>
              )}

              {user.tier === SubscriptionTier.FREE && (
                <button 
                  onClick={() => { onUpgrade(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors mb-1"
                >
                  <i className="fa-solid fa-rocket"></i>
                  Upgrade to Pro
                </button>
              )}

              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileDropdown;
