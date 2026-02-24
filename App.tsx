
import React, { useState, useEffect, useCallback } from 'react';
import { User, InterviewDifficulty, InterviewType, InterviewerPersona, InterviewSession, InterviewScenario, InterviewFeedback } from './types';
import LiveSession from './components/LiveSession';
import FeedbackDisplay from './components/FeedbackDisplay';
import HelpOverlay from './components/HelpOverlay';
import AuthScreen from './components/AuthScreen';
import Logo from './components/Logo';
import { analyzeInterviewFeedback, generateInterviewScenario } from './services/geminiService';

console.log("Envision Paths: App.tsx module loading...");

const PREDEFINED_ROLES = [
  "Warehouse Associate", "Line Cook", "Prep Cook", "Dishwasher", "Delivery Driver",
  "Forklift Operator", "Retail Sales Associate", "Barista", "Customer Service Representative",
  "Maintenance Technician", "Security Guard", "Janitorial Worker", "Construction Laborer",
  "Stocker / Merchandiser", "Server / Waitstaff", "Inventory Clerk", "Auto Mechanic",
  "Package Handler", "Hospitality Assistant", "Housekeeper"
];

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15);
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [step, setStep] = useState<'onboarding' | 'practice' | 'analyzing' | 'result'>('onboarding');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const [config, setConfig] = useState({
    role: 'Warehouse Associate',
    company: 'Local Fulfillment Center',
    difficulty: InterviewDifficulty.EASY,
    type: InterviewType.BEHAVIORAL,
    persona: InterviewerPersona.FRIENDLY,
    useCamera: false,
    resumeText: '',
    jobDescription: ''
  });

  const [scenario, setScenario] = useState<InterviewScenario | null>(null);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);

  // Robust Auth Check on Mount
  useEffect(() => {
    const savedUser = localStorage.getItem('envision_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      } catch (e) {
        localStorage.removeItem('envision_user');
      }
    }

    const savedHistory = localStorage.getItem('envision_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem('envision_history');
      }
    }

    const savedResume = localStorage.getItem('envision_resume') || '';
    const savedJD = localStorage.getItem('envision_jd') || '';
    setConfig(prev => ({ ...prev, resumeText: savedResume, jobDescription: savedJD }));
    
    setIsInitialized(true);
  }, []);

  // Handle Payment Success/Cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success' && sessionId && user) {
      // In a real app, we'd verify the session on the backend
      // For this demo, we'll optimistically update the user
      const updatedUser = { ...user, isPro: true };
      setUser(updatedUser);
      localStorage.setItem('envision_user', JSON.stringify(updatedUser));
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Welcome to Envision Paths Pro! Your account has been upgraded.");
    } else if (paymentStatus === 'cancel') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Checkout cancelled.");
    }
  }, [user]);

  // Sync Resume/JD to storage
  useEffect(() => {
    localStorage.setItem('envision_resume', config.resumeText);
    localStorage.setItem('envision_jd', config.jobDescription);
  }, [config.resumeText, config.jobDescription]);

  // Generate Scenario
  useEffect(() => {
    if (user && step === 'onboarding') {
      const timer = setTimeout(async () => {
        setIsGeneratingScenario(true);
        try {
          const resScenario = await generateInterviewScenario(config.role, config.company, config.type, config.difficulty, config.persona);
          setScenario(resScenario);
        } catch (e) {
          console.error("Scenario Error:", e);
        } finally {
          setIsGeneratingScenario(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [config.persona, config.role, config.company, step, user]);

  const handleAuthenticate = (userData: { name: string; email: string }) => {
    setUser(userData);
    localStorage.setItem('envision_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('envision_user');
    setStep('onboarding');
  };

  const handleGoPro = async () => {
    if (!user || isPaying) return;
    setIsPaying(true);
    try {
      console.log("Initiating checkout for:", user.email);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.url) {
        console.log("Redirecting to Stripe:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (e: any) {
      console.error("Payment Error:", e);
      alert(`Payment Error: ${e.message || "Failed to initiate checkout. Please check your internet connection and try again."}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleStart = () => setStep('practice');

  const getEmptyFeedback = (reason: string): InterviewFeedback => ({
    score: 0,
    strengths: [],
    improvements: [
      "Immediate Engagement: You must speak to participate in the interview.",
      "Professional Presence: Ending a session prematurely is viewed as an automatic failure in real-world hiring.",
      "Content Delivery: No data was provided to evaluate your skills."
    ],
    summary: `UNSUCCESSFUL ATTEMPT: ${reason}. You failed to engage with the interviewer or exited the session before any meaningful exchange occurred. In a professional setting, this results in an immediate disqualification.`,
    coachingTips: [
      { title: "Break the Silence", content: "Even a simple 'Hello, thank you for having me' counts as engagement.", category: "Communication" }
    ],
    metrics: {
      pacing: { score: 0, label: "Non-existent", details: "No speech detected." },
      fillerWords: { score: 0, countDescription: "0 words", details: "No data.", breakdown: [] },
      conciseness: { score: 0, label: "Abrupt", details: "Session ended prematurely." },
      clarity: { score: 0, label: "Silent", details: "No vocal signal." },
      visual: {
        eyeContact: { score: 0, label: "N/A" },
        posture: { score: 0, label: "N/A" },
        gestures: { score: 0, label: "N/A" }
      }
    }
  });

  const handleEndSession = async (transcription: string[], videoUrl?: string) => {
    setStep('analyzing');
    
    // Explicit hard penalties for dead air or short sessions
    const candidateLines = transcription.filter(line => line.startsWith('You:'));
    const candidateText = candidateLines.map(line => line.replace('You:', '').trim()).join(' ');
    const wordCount = candidateText.split(/\s+/).filter(w => w.length > 0).length;
    
    try {
      let feedback: InterviewFeedback;
      
      if (wordCount < 10) {
        feedback = getEmptyFeedback("Candidate was silent or provided less than 10 words of input");
      } else if (transcription.length < 5) {
        feedback = getEmptyFeedback("Session terminated during the introduction phase");
      } else {
        feedback = await analyzeInterviewFeedback(transcription, config.role, config.resumeText, config.jobDescription);
      }

      const session: InterviewSession = { 
        id: generateId(), 
        ...config, 
        transcription, 
        feedback, 
        timestamp: Date.now(),
        videoUrl, 
        scenario: scenario || undefined
      };
      
      const updatedHistory = [session, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('envision_history', JSON.stringify(updatedHistory.map(s => ({ ...s, videoUrl: undefined }))));
      setCurrentSession(session);
      setStep('result');
    } catch (e) { 
      console.error(e);
      setStep('onboarding'); 
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans selection:bg-red-500/30">
      <header className="bg-slate-950 border-b border-slate-800 h-16 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center cursor-pointer group" onClick={() => setStep('onboarding')}>
            <Logo size="sm" />
          </div>
          <div className="flex items-center space-x-6">
            {!user.isPro && (
              <button 
                onClick={handleGoPro}
                disabled={isPaying}
                className={`hidden md:flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-red-500 to-red-700 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-red-900/20 ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPaying ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                )}
                <span>{isPaying ? 'Processing...' : 'Go Pro $9.99'}</span>
              </button>
            )}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-800">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${user.isPro ? 'bg-amber-500 text-slate-950' : 'bg-red-600'}`}>{user.name[0]}</div>
              <span className="text-xs font-bold text-slate-300">{user.name} {user.isPro && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded ml-1">PRO</span>}</span>
              <button onClick={handleLogout} className="ml-2 p-1 hover:text-red-400 transition-colors" title="Logout">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
            <button onClick={() => setIsHelpOpen(true)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              FAQ
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {step === 'onboarding' && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
            <div className="lg:col-span-8 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xs font-black text-red-500 uppercase tracking-widest">1. Position</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all" 
                    value={config.role} 
                    onChange={(e) => setConfig({...config, role: e.target.value})}
                  >
                    {PREDEFINED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input 
                    placeholder="Target Company" 
                    className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none text-sm transition-all focus:ring-2 focus:ring-red-500" 
                    value={config.company} 
                    onChange={(e) => setConfig({...config, company: e.target.value})} 
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-black text-red-500 uppercase tracking-widest">2. Persona</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {Object.values(InterviewerPersona).map((p) => {
                    const isSelected = config.persona === p;
                    return (
                      <button 
                        key={p} 
                        onClick={() => setConfig({...config, persona: p})} 
                        className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${isSelected ? 'bg-red-600/10 border-red-500' : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100'}`}
                      >
                        <div className="text-sm font-bold mb-1">{p}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Select Mode</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-black text-red-500 uppercase tracking-widest">3. Experience Level</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.values(InterviewDifficulty).map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setConfig({...config, difficulty: d})} 
                      className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${config.difficulty === d ? 'bg-red-600 border-red-600' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-6">
                <button 
                  onClick={handleStart} 
                  className="w-full py-5 bg-red-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-red-900/30 hover:bg-red-700 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center space-x-3"
                >
                  <span>Launch Practice</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-full min-h-[400px] flex flex-col shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Scenario Builder</h2>
                    {isGeneratingScenario && <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
                  </div>
                  
                  {scenario ? (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                       <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                          <div className="text-[10px] font-black text-red-400 uppercase mb-1">Company Detail</div>
                          <div className="text-xs text-slate-300 leading-relaxed">{scenario.companyDescription}</div>
                       </div>
                       <div className="space-y-3">
                          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Example Questions</div>
                          {scenario.questions.slice(0, 3).map((q, i) => (
                            <div key={i} className="text-[11px] p-3 bg-slate-950 border border-slate-800 rounded-xl italic text-slate-400 border-l-2 border-l-red-500">"{q}"</div>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center opacity-20 text-center">
                       <svg className="w-12 h-12 mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.503 1.508a2 2 0 01-1.248 1.248l-1.508.503a2 2 0 00-1.414 1.96l.477 2.387a2 2 0 00.547 1.022l1.428 1.428a2 2 0 001.022.547l2.387.477a2 2 0 001.96-1.414l.503-1.508a2 2 0 011.248-1.248l1.508-.503a2 2 0 001.414-1.96l-.477-2.387a2 2 0 00-.547-1.022l-1.428-1.428z" /></svg>
                       <div className="text-[10px] font-black uppercase">Building Scenario...</div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {step === 'practice' && (
          <LiveSession {...config} scenarioQuestions={scenario?.questions} onEnd={handleEndSession} />
        )}

        {step === 'analyzing' && (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-1000">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-red-500 uppercase">AI</div>
             </div>
             <div className="text-center">
                <h3 className="text-xl font-black mb-1">Scrutinizing Transcript</h3>
                <p className="text-xs text-slate-500">Cross-referencing with industry benchmarks...</p>
             </div>
          </div>
        )}

        {step === 'result' && currentSession && (
          <FeedbackDisplay session={currentSession} onRestart={() => setStep('onboarding')} />
        )}
      </main>

      <HelpOverlay isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;
