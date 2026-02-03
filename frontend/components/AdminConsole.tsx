
import React, { useEffect, useState } from 'react';
import { User, SubscriptionTier } from '../types';
import { taskService } from '../services/taskService';

interface AdminConsoleProps {
  onExit: () => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ onExit }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (userId: string) => {
    try {
      const updatedUser = await taskService.toggleUserBlock(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-in fade-in duration-300">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Backoffice Console</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator Access Only</p>
          </div>
        </div>
        <button 
          onClick={onExit}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
        >
          Exit Console
        </button>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Registered Users ({users.length})</h2>
              <button 
                onClick={fetchUsers}
                className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate"></i> Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Fetching secure user list...</p>
              </div>
            ) : error ? (
              <div className="p-20 text-center">
                <i className="fa-solid fa-circle-exclamation text-red-500 text-3xl mb-4"></i>
                <p className="text-slate-800 font-bold">{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Tier</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                              {user.picture ? (
                                <img src={user.picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                                  {user.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${user.tier === SubscriptionTier.PRO ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {user.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.isAdmin ? (
                            <span className="flex items-center gap-1.5 text-amber-600 text-xs font-bold">
                              <i className="fa-solid fa-crown text-[10px]"></i> Admin
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">User</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${user.isBlocked ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <span className={`text-xs font-bold ${user.isBlocked ? 'text-red-600' : 'text-emerald-600'}`}>
                              {user.isBlocked ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!user.isAdmin && (
                            <button 
                              onClick={() => handleToggleBlock(user.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${user.isBlocked ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                              {user.isBlocked ? 'Restore Access' : 'Suspend User'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
