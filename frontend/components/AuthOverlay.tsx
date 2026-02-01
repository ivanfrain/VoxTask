import React, { useEffect, useState } from 'react';
import { User, SubscriptionTier } from '../types';
import { taskService } from '../services/taskService';

interface AuthOverlayProps {
  onLogin: (user: User) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
      try {
        setLoading(true);
        // Decode JWT payload (base64)
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        const syncedUser = await taskService.syncUser({
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });

        onLogin(syncedUser);
      } catch (err) {
        setError('Google authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const google = (window as any).google;
    if (google) {
      google.accounts.id.initialize({
        client_id: '923184617562-placeholder.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'filled_blue', size: 'large', width: 320, shape: 'pill' }
      );
    }
  }, [onLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let user: User;
      if (isRegistering) {
        if (!name) throw new Error('Name is required');
        user = await taskService.registerWithEmail(email, password, name);
      } else {
        user = await taskService.loginWithEmail(email, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20 carplay-gradient"></div>
      
      <div className="relative w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-2xl shadow-blue-500/30 mb-4 animate-in zoom-in duration-500">
            <i className="fa-solid fa-check-double"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">VoxTask Pro</h1>
          <p className="text-slate-400">Next-generation task management</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <div id="google-signin-btn" className="flex justify-center mb-6"></div>
          
          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest">or use email</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right-to-bracket"></i>}
              {isRegistering ? 'Create Pro Account' : 'Sign In with Email'}
            </button>
          </form>

          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="mt-6 text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
        
        <div className="mt-8 flex justify-center gap-8 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-blue-500"></i>
            <span>AES-256 Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-cloud text-emerald-500"></i>
            <span>Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;