
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const logoUrl = localStorage.getItem('wf_logo_url') || "https://logo.clearbit.com/daltexcorp.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 md:p-10 border border-white/50">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-32 h-32 flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 bg-blue-50 rounded-full opacity-50 blur-xl"></div>
                <img 
                    src={logoUrl} 
                    alt="Daltex Logo" 
                    className="w-full h-full object-contain relative z-10 drop-shadow-sm"
                    onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = "https://ui-avatars.com/api/?name=Daltex&background=0D8ABC&color=fff&size=128&font-size=0.4";
                    }}
                />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 text-center tracking-tight">
              Daltex <span className="text-blue-600">Maintenance</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide uppercase mt-1">Management System</p>
        </div>
        
        {/* Form Section */}
        <div>
            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r shadow-sm text-sm">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Username</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                            placeholder="Enter your username"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700 ml-1">Password</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                
                <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    Sign In
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                <p className="mb-2 font-medium">System Access Only</p>
                <div className="flex flex-wrap justify-center gap-3 opacity-75">
                    <span className="bg-slate-100 px-2 py-1 rounded">Admin: <strong>admin</strong></span>
                    <span className="bg-slate-100 px-2 py-1 rounded">User: <strong>operator</strong></span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
