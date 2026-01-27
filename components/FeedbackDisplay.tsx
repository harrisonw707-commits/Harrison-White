
import React, { useState, useEffect } from 'react';
import { InterviewSession } from '../types';
import { searchLiveJobs } from '../services/geminiService';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

interface FeedbackProps {
  session: InterviewSession;
  onRestart: () => void;
}

const FeedbackDisplay: React.FC<FeedbackProps> = ({ session, onRestart }) => {
  const { feedback } = session;
  const [jobResults, setJobResults] = useState<{text: string, links: any[]} | null>(null);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsSearchingJobs(true);
      try {
        const res = await searchLiveJobs(session.role, session.company);
        setJobResults(res);
      } catch (e) { console.error(e); } finally { setIsSearchingJobs(false); }
    };
    fetchJobs();
  }, [session.role, session.company]);

  // Prepare data for the skill radar
  const radarData = [
    { subject: 'Clarity', A: feedback.metrics.clarity.score, fullMark: 100 },
    { subject: 'Conciseness', A: feedback.metrics.conciseness.score, fullMark: 100 },
    { subject: 'Pacing', A: feedback.metrics.pacing.score, fullMark: 100 },
    { subject: 'Confidence', A: feedback.score, fullMark: 100 },
    { subject: 'Fillers', A: feedback.metrics.fillerWords.score, fullMark: 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom duration-700 text-slate-100 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-8 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-50">{session.role} <span className="text-blue-500">Analysis</span></h2>
          <p className="text-slate-500 font-medium tracking-tight">Practiced with {session.persona} • {new Date(session.timestamp).toLocaleDateString()}</p>
        </div>
        <div className="text-left md:text-right">
           <div className="text-5xl font-black text-blue-500">{feedback.score}<span className="text-xl text-slate-700">/100</span></div>
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance Score</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Visuals & Transcript */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden shadow-2xl">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
               <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" /></svg>
               Session Playback
             </h3>
             {session.videoUrl ? (
               <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 group relative">
                 <video src={session.videoUrl} controls className="w-full h-full object-contain" />
               </div>
             ) : (
               <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center p-6 border border-slate-800 border-dashed rounded-2xl opacity-40">
                 <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
                 <span className="text-[10px] font-bold uppercase">Audio-Only Session</span>
               </div>
             )}
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Interview Log</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {session.transcription.length > 0 ? (
                  session.transcription.map((line, i) => (
                    <div key={i} className={`text-[11px] leading-relaxed p-3 rounded-xl border ${line.startsWith('You:') ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-slate-800/40 border-slate-800'}`}>
                      <span className={`font-bold uppercase tracking-widest ${line.startsWith('You:') ? 'text-emerald-400' : 'text-blue-400'}`}>{line.split(':')[0]}</span>
                      <span className="text-slate-400 ml-2">{line.split(':').slice(1).join(':')}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-600 italic text-[10px]">No conversation recorded.</div>
                )}
              </div>
           </div>
        </div>

        {/* Right Column: Performance Data */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Performance Scorecard</h3>
             <div className="grid md:grid-cols-2 gap-12">
               <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
               <div className="space-y-4">
                 <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/20 p-6 rounded-2xl border border-slate-800 shadow-inner">
                   <div className="text-blue-400 font-black uppercase tracking-tighter text-[10px] mb-2 flex items-center">
                     <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3z" /></svg>
                     Executive Summary
                   </div>
                   {feedback.summary}
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                       <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Pacing</div>
                       <div className="text-xs font-black text-blue-400">{feedback.metrics.pacing.label}</div>
                    </div>
                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                       <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Clarity</div>
                       <div className="text-xs font-black text-emerald-400">{feedback.metrics.clarity.label}</div>
                    </div>
                 </div>
               </div>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-lg border-t-4 border-t-emerald-500/40">
               <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center text-emerald-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Key Strengths
               </h4>
               <ul className="space-y-3">
                 {feedback.strengths.length > 0 ? feedback.strengths.map((s, i) => (
                   <li key={i} className="flex items-start space-x-3 text-[11px] text-slate-400">
                     <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                     <span>{s}</span>
                   </li>
                 )) : <li className="text-[11px] text-slate-600 italic">No strengths identified in this attempt.</li>}
               </ul>
             </div>

             <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-lg border-t-4 border-t-amber-500/40">
               <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center text-amber-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Improvements
               </h4>
               <ul className="space-y-3">
                 {feedback.improvements.map((s, i) => (
                   <li key={i} className="flex items-start space-x-3 text-[11px] text-slate-400">
                     <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                     <span>{s}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>

          {/* Next Steps: Personalized Roadmap */}
          <div className="bg-blue-600/5 border border-blue-500/20 rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2">Recommended Next Steps</h3>
              <p className="text-slate-500 text-sm mb-10">Maximize your growth by following these targeted paths.</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between group hover:border-blue-500/40 transition-all cursor-pointer" onClick={onRestart}>
                  <div>
                    <div className="w-10 h-10 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="font-bold text-slate-100 mb-2">Scheduled Re-Trial</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Try a <span className="text-slate-300">Strict Manager</span> persona next to build pressure tolerance.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center text-[10px] font-black text-blue-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Start New Practice <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
                  <div>
                    <div className="w-10 h-10 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h4 className="font-bold text-slate-100 mb-2">Skill Enhancement</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Focus on <span className="text-slate-300">STAR Method</span> training to resolve conciseness gaps.
                    </p>
                  </div>
                  <a href="https://www.google.com/search?q=STAR+method+interview+guide" target="_blank" className="mt-6 flex items-center text-[10px] font-black text-emerald-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    View Resources <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between group hover:border-indigo-500/40 transition-all">
                  <div>
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h4 className="font-bold text-slate-100 mb-2">Market Application</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Explore 3 new <span className="text-slate-300">{session.role}</span> opportunities in your area.
                    </p>
                  </div>
                  <div className={`mt-6 flex items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest ${isSearchingJobs ? 'animate-pulse' : ''}`}>
                    {isSearchingJobs ? 'Searching Jobs...' : (jobResults?.links[0]?.title || 'Jobs Found')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-12 border-t border-slate-900">
        <button onClick={onRestart} className="px-12 py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm">Return to Dashboard</button>
        <button onClick={() => window.print()} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all text-sm shadow-xl shadow-blue-900/30 flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          <span>Export Report</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackDisplay;
