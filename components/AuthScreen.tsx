
import React, { useState } from 'react';

import { User } from '../types';

interface AuthScreenProps {
  onAuthenticate: (userData: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    onAuthenticate({
      name: name || email.split('@')[0] || 'User',
      email: email
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in zoom-in-95 duration-500 z-10">
        <div className="flex flex-col items-center mb-10 text-center">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-900/40 mb-6">H</div>
           <h1 className="text-3xl font-black tracking-tight text-white mb-2">HireQuest AI</h1>
           <p className="text-slate-500 text-sm leading-relaxed">
             {isLogin ? "Welcome back. Access your personalized practice portal." : "Join thousands of candidates mastering their interviews."}
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
           {!isLogin && (
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
               <input 
                 required
                 className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white" 
                 placeholder="Jane Doe"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
               />
             </div>
           )}
           
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
             <input 
               required
               type="email"
               className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white" 
               placeholder="jane@example.com"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
             />
           </div>

           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
             <input 
               required
               type="password"
               className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white" 
               placeholder="••••••••"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
             />
           </div>

           <button 
             type="submit" 
             className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4"
           >
             {isLogin ? "Sign In" : "Register Now"}
           </button>
        </form>

        <div className="mt-10 text-center">
           <button 
             onClick={() => setIsLogin(!isLogin)}
             className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors"
           >
             {isLogin ? "New to HireQuest? Create account" : "Already a member? Sign in"}
           </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
