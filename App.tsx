
import React, { useState, useEffect } from 'react';
import { InterviewDifficulty, InterviewType, InterviewerPersona, InterviewSession, InterviewScenario, SkillsGapAnalysis, InterviewFeedback, CoachingTip } from './types';
import LiveSession from './components/LiveSession';
import FeedbackDisplay from './components/FeedbackDisplay';
import HelpOverlay from './components/HelpOverlay';
import AuthScreen from './components/AuthScreen';
import { analyzeInterviewFeedback, generateInterviewScenario, analyzeSkillsGap, fetchIndustryTrends } from './services/geminiService';

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
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [step, setStep] = useState<'onboarding' | 'practice' | 'analyzing' | 'result'>('onboarding');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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

  useEffect(() => {
    // Robust local storage initialization
    const initApp = () => {
      try {
        const savedUser = localStorage.getItem('hirequest_user');
        if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.email) {
            setUser(parsed);
          }
        }
        
        const savedHistory = localStorage.getItem('hirequest_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        const savedResume = localStorage.getItem('hirequest_resume') || '';
        const savedJD = localStorage.getItem('hirequest_jd') || '';
        setConfig(prev => ({ ...prev, resumeText: savedResume, jobDescription: savedJD }));
      } catch (e) {
        console.warn("Initialization recovery triggered:", e);
        localStorage.clear(); // Safe wipe if corruption detected
      } finally {
        setIsInitialized(true);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    if (user && step === 'onboarding') {
      const timer = setTimeout(async () => {
        setIsGeneratingScenario(true);
        setScenario(null); 
        try {
          const resScenario = await generateInterviewScenario(config.role, config.company, config.type, config.difficulty, config.persona);
          setScenario(resScenario);
        } catch (e) { console.error(e); }
        finally { 
          setIsGeneratingScenario(false); 
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [config.persona, config.role, config.company, step, user]);

  const handleAuthenticate = (userData: { name: string; email: string }) => {
    setUser(userData);
    localStorage.setItem('hirequest_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hirequest_user');
    localStorage.removeItem('hirequest_history');
    setStep('onboarding');
  };

  const handleStart = () => setStep('practice');

  const getEmptyFeedback = (reason: string): InterviewFeedback => ({
    score: 0,
    strengths: [],
    improvements: ["Participate in the interview.", "Avoid ending the session prematurely.", "Speak clearly and answer all questions."],
    summary: `FAILURE: ${reason}. Non-participation or immediate termination resulted in an automatic zero score. A real interviewer would consider this a forfeited opportunity.`,
    coachingTips: [
      { title: "Engagement", content: "Practice just saying 'Hello' to get started.", category: "Communication" }
    ],
    metrics: {
      pacing: { score: 0, label: "Zero", details: "No data." },
      fillerWords: { score: 0, countDescription: "0 words", details: "No data.", breakdown: [] },
      conciseness: { score: 0, label: "Empty", details: "No content." },
      clarity: { score: 0, label: "Silent", details: "No vocal data." },
      visual: {
        eyeContact: { score: 0, label: "N/A" },
        posture: { score: 0, label: "N/A" },
        gestures: { score: 0, label: "N/A" }
      }
    }
  });

  const handleEndSession = async (transcription: string[], videoUrl?: string) => {
    const candidateLines = transcription.filter(line => line.startsWith('You:'));
    const userSpeaks = candidateLines.some(line => line.replace('You:', '').trim().length > 0);
    const candidateText = candidateLines.map(line => line.replace('You:', '').trim()).join(' ');
    const candidateWordCount = candidateText.split(/\s+/).filter(word => word.length > 0).length;
    
    setStep('analyzing');
    
    try {
      let feedback: InterviewFeedback;
      
      if (!userSpeaks || candidateWordCount < 5) {
        feedback = getEmptyFeedback("Candidate was silent or provided no meaningful input");
      } else if (transcription.length < 4) {
        feedback = getEmptyFeedback("Interview was terminated prematurely before enough data was gathered");
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
      
      const updated = [session, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem('hirequest_history', JSON.stringify(updated.map(s => ({ ...s, videoUrl: undefined }))));
      setCurrentSession(session);
      setStep('result');
    } catch (e) { 
      console.error(e);
      setStep('onboarding'); 
    }
  };

  if (!isInitialized) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) {
    return <AuthScreen onAuthenticate={handleAuthenticate} />;
  }

  const personaDetails = {
    [InterviewerPersona.FRIENDLY]: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      color: "border-emerald-500/50",
      activeColor: "bg-emerald-600/20 border-emerald-500",
      label: "Encouraging Mentor",
      description: "Supportive and patient."
    },
    [InterviewerPersona.STRICT]: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      color: "border-amber-500/50",
      activeColor: "bg-amber-600/20 border-amber-500",
      label: "High-Pressure Manager",
      description: "Direct and results-focused."
    },
    [InterviewerPersona.EXPERT]: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
      color: "border-indigo-500/50",
      activeColor: "bg-indigo-600/20 border-indigo-500",
      label: "Technical Evaluator",
      description: "Deep-dives into skills."
    },
    [InterviewerPersona.DYNAMIC]: {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
      color: "border-purple-500/50",
      activeColor: "bg-purple-600/20 border-purple-500",
      label: "Dynamic Professional",
      description: "Adjusts tone based on your performance."
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans">
      <header className="bg-slate-950 border-b border-slate-800 h-16 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setStep('onboarding')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-900/40">H</div>
            <span className="font-bold text-xl tracking-tighter">HireQuest<span className="text-blue-500">AI</span></span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-800">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">{user.name[0]}</div>
              <span className="text-xs font-bold text-slate-300">{user.name}</span>
              <button onClick={handleLogout} className="ml-2 p-1 hover:text-red-400 transition-colors" title="Logout">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
            <button onClick={() => setIsHelpOpen(true)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Help & FAQ
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
        {step === 'onboarding' && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
            <div className="lg:col-span-8 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xs font-black text-blue-500 uppercase tracking-widest">Step 1: Role Configuration</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <select className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={config.role} onChange={(e) => setConfig({...config, role: e.target.value})}>
                    {PREDEFINED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input placeholder="Company Name" className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none text-sm" value={config.company} onChange={(e) => setConfig({...config, company: e.target.value})} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-black text-blue-500 uppercase tracking-widest">Step 2: Choose Your Interviewer</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {Object.values(InterviewerPersona).map((p) => {
                    const details = personaDetails[p];
                    const isSelected = config.persona === p;
                    return (
                      <button key={p} onClick={() => setConfig({...config, persona: p})} className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${isSelected ? details.activeColor : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'}`}>
                        <div className={`mb-3 ${isSelected ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{details.icon}</div>
                        <div className="text-sm font-bold mb-1">{details.label}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest leading-tight">{details.description}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-black text-blue-500 uppercase tracking-widest">Step 3: Media Settings</h2>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.useCamera ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold">Visual Feedback (Camera)</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Enable for posture analysis</div>
                    </div>
                  </div>
                  <button onClick={() => setConfig({...config, useCamera: !config.useCamera})} className={`w-14 h-8 rounded-full transition-all relative ${config.useCamera ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.useCamera ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </section>

              <div className="pt-4">
                <button onClick={handleStart} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center justify-center space-x-3">
                  <span>Start Practice Session</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col min-h-[450px] shadow-2xl overflow-y-auto custom-scrollbar">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Scenario Guide</h2>
                    {isGeneratingScenario && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                 </div>
                 {scenario ? (
                   <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800/60">
                        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Interviewer</div>
                        <div className="text-sm font-bold text-slate-100">{scenario.interviewerName}</div>
                        <div className="text-[10px] text-slate-500">{scenario.interviewerTitle}</div>
                      </div>

                      <div className="border border-emerald-500/20 rounded-2xl overflow-hidden">
                        <div className="p-4 bg-emerald-500/5 flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Key Questions</span>
                        </div>
                        <div className="p-4 space-y-4 bg-slate-900/60">
                          {scenario.questions && scenario.questions.slice(0, 3).map((q, i) => (
                            <div key={i} className="text-[11px] font-bold text-slate-100 italic border-l border-emerald-500/20 pl-2">"{q}"</div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-6">
                        <div className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>
                          Red Flags to Avoid
                        </div>
                        <div className="space-y-4">
                          {scenario.candidateQuestionsToAvoid && scenario.candidateQuestionsToAvoid.slice(0, 2).map((item, i) => (
                            <div key={i} className="text-[11px] leading-relaxed">
                              <div className="text-slate-400 line-through opacity-40 italic">"{item.q}"</div>
                              <div className="text-slate-600 text-[10px] pl-2 border-l border-red-500/20 mt-1">{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30">
                      <svg className="w-12 h-12 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
                      <span className="text-xs font-bold uppercase tracking-widest">Generating Guide...</span>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {step === 'practice' && (
          <LiveSession {...config} preInterviewTips={scenario?.preInterviewTips} scenarioQuestions={scenario?.questions} onEnd={handleEndSession} />
        )}
        {step === 'analyzing' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in">
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-2xl font-black">Analyzing Performance...</h3>
          </div>
        )}
        {step === 'result' && currentSession && <FeedbackDisplay session={currentSession} onRestart={() => setStep('onboarding')} />}
      </main>

      <HelpOverlay isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;
