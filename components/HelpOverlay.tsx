
import React from 'react';

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpOverlay: React.FC<HelpOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold">Platform Guide</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Mastering Your Session</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Section: Video Practice */}
          <section className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
              </div>
              <h3 className="font-bold text-lg">Video & Visual Analysis</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              HireQuest uses your <strong className="text-slate-200">camera</strong> to analyze non-verbal cues. The AI observes your presence in real-time to provide feedback on professional appearance.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
               <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Eye Contact</div>
                  <p className="text-[9px] text-slate-500">Maintains focus on the lens, projecting confidence.</p>
               </div>
               <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Posture</div>
                  <p className="text-[9px] text-slate-500">Detects slouching or unengaged physical positioning.</p>
               </div>
            </div>
          </section>

          {/* Section: Fair Practice */}
          <section className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center text-amber-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="font-bold text-lg">Know Your Rights</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Interviewer questions must be job-related. In many regions, questions about personal life or protected characteristics are <strong className="text-slate-200">illegal</strong>. Our AI is programmed to avoid:
            </p>
            <div className="space-y-2">
              {[
                { label: 'Family Status', example: '"Do you have children?" or "Are you married?"' },
                { label: 'Age & Heritage', example: '"When did you graduate?" or "Where are you from?"' },
                { label: 'Religion/Politics', example: '"What holidays do you observe?"' },
                { label: 'Citizenship', example: '"Are you a US Citizen?" (vs "Are you authorized to work?")' },
              ].map(item => (
                <div key={item.label} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-black text-amber-500 uppercase mb-0.5">{item.label}</div>
                  <div className="text-[11px] text-slate-400 italic">{item.example}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Personas */}
          <section className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center text-emerald-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <h3 className="font-bold text-lg">Interview Personas</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Friendly Mentor', desc: 'Positive, patient, and great for building early confidence.', color: 'text-emerald-400' },
                { name: 'Strict Manager', desc: 'High pressure, direct, and focused on short, impactful answers.', color: 'text-amber-400' },
                { name: 'Technical Expert', desc: 'Deep-dives into skills, safety protocols, and industry jargon.', color: 'text-indigo-400' },
                { name: 'Dynamic Pro', desc: 'Reacts to you. If you are doing well, the heat turns up.', color: 'text-purple-400' }
              ].map(p => (
                <div key={p.name} className="flex space-x-3 p-3 bg-slate-800/20 rounded-xl border border-slate-800/50">
                   <div className={`w-1 h-auto rounded-full bg-current ${p.color}`} />
                   <div>
                     <div className={`text-[10px] font-black uppercase ${p.color}`}>{p.name}</div>
                     <p className="text-[11px] text-slate-400">{p.desc}</p>
                   </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Privacy & Security */}
          <section className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="font-bold text-lg">Your Privacy</h3>
            </div>
            <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20">
              <p className="text-xs text-slate-300 leading-relaxed">
                Your video recording is <strong className="text-white">temporary</strong>. The session recording is stored as a Blob URL in your browser's memory. Once you refresh or close the tab, the video is gone. 
                <br/><br/>
                No video data is sent to our servers. Only static image frames are sent to the Google Gemini API for real-time analysis.
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all text-sm shadow-xl shadow-blue-900/20"
          >
            Ready to Practice
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
