
import React, { useState } from 'react';

interface AuthScreenProps {
  onAuthenticate: (userData: { name: string; email: string }) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication logic
    onAuthenticate({
      name: name || email.split('@')[0] || 'Candidate',
      email: email || 'user@example.com'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse duration-700" />
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-700">
        
        {/* Left Side: Branding/Hero */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
          <div className="z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-xl backdrop-blur-md">H</div>
              <span className="font-bold text-2xl tracking-tighter">HireQuest<span className="text-blue-200">AI</span></span>
            </div>
            <h1 className="text-4xl font-black leading-tight mb-6">
              Your next career move <br/> starts with practice.
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed opacity-90">
              Master the art of the interview with real-time AI feedback and industry-specific simulations.
            </p>
          </div>

          <div className="z-10 space-y-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-500 bg-slate-800 overflow-hidden shadow-lg">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-blue-400 flex items-center justify-center text-[10px] font-black">10k+</div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Joined by 10,000+ candidates</p>
          </div>

          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Sign in to continue your preparation' : 'Create an account to start your journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                required
                type="email" 
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                {isLogin && <button type="button" className="text-[10px] font-bold text-blue-500 hover:text-blue-400">Forgot?</button>}
              </div>
              <input 
                required
                type="password" 
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 flex items-center space-x-4">
            <div className="flex-grow h-px bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Or continue with</span>
            <div className="flex-grow h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button className="flex items-center justify-center space-x-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all group">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.928 4.176-1.02 1.024-2.304 1.896-4.592 1.896-3.576 0-6.392-2.904-6.392-6.48s2.816-6.48 6.392-6.48c1.936 0 3.384.768 4.428 1.752l2.312-2.312C18.224 4.056 15.824 3 12.48 3 6.672 3 2 7.68 2 13.5S6.672 24 12.48 24c3.144 0 5.52-1.032 7.392-3 1.92-1.92 2.536-4.592 2.536-6.752 0-.648-.048-1.288-.144-1.832h-9.784z"/></svg>
              <span className="text-xs font-bold text-white">Google</span>
            </button>
            <button className="flex items-center justify-center space-x-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all group">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V21.88C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>
              <span className="text-xs font-bold text-white">Apple</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
