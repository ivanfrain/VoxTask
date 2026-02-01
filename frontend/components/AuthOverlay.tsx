
import React, { useEffect } from 'react';
import { User, SubscriptionTier } from '../types';
import { taskService } from '../services/taskService';

interface AuthOverlayProps {
  onLogin: (user: User) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin }) => {
  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
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
    };

    // Initialize Google Identity Services
    // Fix: access window.google by casting window to any to avoid TypeScript property errors
    const google = (window as any).google;
    if (google) {
      google.accounts.id.initialize({
        client_id: '923184617562-placeholder.apps.googleusercontent.com', // User would replace this
        callback: handleCredentialResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'filled_blue', size: 'large', width: 280, shape: 'pill' }
      );
    }
  }, [onLogin]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20 carplay-gradient"></div>
      
      <div className="relative w-full max-w-md text-center">
        <div className="mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl shadow-2xl shadow-blue-500/30 mb-6">
            <i className="fa-solid fa-check-double"></i>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">VoxTask Pro</h1>
          <p className="text-slate-400 text-lg">Next-generation voice task manager</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl">
          <p className="text-white font-medium mb-6">Sign in to sync your tasks across devices</p>
          <div id="google-signin-btn" className="flex justify-center"></div>
          
          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4 text-slate-500 text-xs">
            <div className="flex flex-col items-center gap-2">
              <i className="fa-solid fa-microphone text-blue-500 text-base"></i>
              <span>Voice AI</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <i className="fa-solid fa-car text-emerald-500 text-base"></i>
              <span>Car Mode</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <i className="fa-solid fa-shield-halved text-amber-500 text-base"></i>
              <span>Sync Protection</span>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-slate-600 text-xs uppercase tracking-widest font-bold">Secure Google Authentication</p>
      </div>
    </div>
  );
};

export default AuthOverlay;
