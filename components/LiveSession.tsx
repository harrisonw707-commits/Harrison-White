
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { InterviewDifficulty, InterviewType, InterviewerPersona } from '../types';

interface LiveSessionProps {
  role: string;
  company: string;
  difficulty: InterviewDifficulty;
  type: InterviewType;
  persona: InterviewerPersona;
  useCamera: boolean;
  resumeText?: string;
  jobDescription?: string;
  preInterviewTips?: { title: string; content: string }[];
  scenarioQuestions?: string[];
  onEnd: (transcript: string[], videoUrl?: string) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ 
  role, 
  company, 
  difficulty, 
  type, 
  persona,
  useCamera,
  resumeText, 
  jobDescription, 
  preInterviewTips = [], 
  scenarioQuestions = [],
  onEnd 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [currentModelText, setCurrentModelText] = useState("");
  const [currentUserText, setCurrentUserText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const frameIntervalRef = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);

  const startSession = async () => {
    setError(null);
    try {
      let stream: MediaStream;
      let videoEnabled = false;

      if (useCamera) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          setIsVideoActive(true);
          videoEnabled = true;
        } catch (e) {
          console.warn("Camera fallback to audio only.", e);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoActive(false);
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsVideoActive(false);
      }
      
      if (videoEnabled && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mimeType = videoEnabled ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorder.start();

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const micSource = audioContextRef.current.createMediaStreamSource(stream);
      micSource.connect(analyserRef.current);

      const getVoiceName = (p: InterviewerPersona) => {
        switch (p) {
          case InterviewerPersona.STRICT: return 'Charon';
          case InterviewerPersona.FRIENDLY: return 'Zephyr';
          case InterviewerPersona.EXPERT: return 'Fenrir';
          case InterviewerPersona.DYNAMIC: return 'Puck';
          default: return 'Zephyr';
        }
      };

      const getPersonaInstruction = (p: InterviewerPersona) => {
        switch (p) {
          case InterviewerPersona.STRICT:
            return "You are a 'Strict Manager' using the 'Charon' voice. Be authoritative, direct, and slightly skeptical. Use short, clipped sentences. Don't offer much encouragement; focus strictly on performance and results.";
          case InterviewerPersona.FRIENDLY:
            return "You are a 'Friendly Mentor' using the 'Zephyr' voice. Be warm, encouraging, and supportive. Use a bright tone, offer positive reinforcement, and help the candidate feel at ease while still being professional.";
          case InterviewerPersona.EXPERT:
            return "You are a 'Technical Expert' using the 'Fenrir' voice. Use a steady, serious, and deeply analytical tone. Focus on technical precision, safety protocols, and deep industry knowledge. Don't settle for surface-level answers.";
          case InterviewerPersona.DYNAMIC:
            return "You are a 'Dynamic Professional' using the 'Puck' voice. Be energetic, varied in tone, and highly conversational. Adjust your intensity based on the candidate's confidence. Use varied prosody and sound engaged.";
          default:
            return "Be a professional interviewer.";
        }
      };

      const systemInstruction = `You are an expert interviewer for a ${role} position at ${company}. 
      ${getPersonaInstruction(persona)}
      
      CONVERSATIONAL REALISM RULES:
      - Use natural human prosody, appropriate pauses, and occasionally fillers ("Hmm", "I see", "Interesting").
      - React dynamically to what the candidate says. If they are brief, probe for more. If they are thorough, acknowledge it.
      ${videoEnabled ? '- OBSERVE VISUAL CUES: You have access to a video feed. Comment on their professional presence, eye contact, or posture if relevant to the interview.' : '- VOICE-ONLY MODE: Camera is OFF. Focus entirely on vocal clarity, tone, and spoken content.'}
      
      INTERVIEW FLOW:
      - Difficulty Level: ${difficulty}.
      - Core Theme: ${type}.
      - Target Questions to cover: ${scenarioQuestions.join(', ')}.
      - Closing Requirement: You MUST end by asking: "Describe yourself in just one word."
      
      Candidate Context:
      Resume Text: ${resumeText || 'No resume provided.'}
      Job Description: ${jobDescription || 'Standard role expectations apply.'}`;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName(persona) } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const bytes = new Uint8Array(int16.buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            micSource.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);

            if (videoEnabled) {
              const captureCanvas = document.createElement('canvas');
              const captureCtx = captureCanvas.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (videoRef.current && captureCtx) {
                  captureCanvas.width = 320;
                  captureCanvas.height = 240;
                  captureCtx.drawImage(videoRef.current, 0, 0, 320, 240);
                  captureCanvas.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', 0.5);
                }
              }, 1000);
            }
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) setCurrentModelText(prev => prev + msg.serverContent!.outputTranscription!.text);
            if (msg.serverContent?.inputTranscription) setCurrentUserText(prev => prev + msg.serverContent!.inputTranscription!.text);
            if (msg.serverContent?.turnComplete) {
              setTranscription(prev => [...prev, `Interviewer: ${currentModelText.trim()}`, `You: ${currentUserText.trim()}`]);
              setCurrentModelText(""); 
              setCurrentUserText("");
            }
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const binary = atob(audioData);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const dataInt16 = new Int16Array(bytes.buffer);
              const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
              const chan = buffer.getChannelData(0);
              for (let i = 0; i < dataInt16.length; i++) {
                chan[i] = dataInt16[i] / 32768.0;
              }
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onerror: () => setError("The session encountered an issue. Please try restarting."),
          onclose: () => setIsActive(false)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      setError("Microphone and/or camera access is required to proceed. Please check your browser permissions."); 
    }
  };

  const endSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const type = isVideoActive ? 'video/webm' : 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        onEnd(transcription, URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.stop();
    } else {
      onEnd(transcription);
    }
    setIsActive(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 flex flex-col items-center justify-center space-y-6 min-h-[550px] relative overflow-hidden">
        {isActive && (
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[120px] rounded-full animate-pulse ${isVideoActive ? 'bg-blue-500' : 'bg-emerald-500'}`} />
          </div>
        )}

        <div className={`relative w-64 h-64 rounded-full border-4 overflow-hidden shadow-2xl transition-all duration-700 ${isActive ? (isVideoActive ? 'border-blue-500 ring-[12px] ring-blue-500/10' : 'border-emerald-500 ring-[12px] ring-emerald-500/10') : 'border-slate-800'}`}>
          {isVideoActive ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale-[10%]" />
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className={`transition-all duration-1000 ${isActive ? 'scale-110 text-emerald-400' : 'scale-100'}`}>
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em]">{isActive ? "Privacy Mode" : "Voice Ready"}</div>
            </div>
          )}
          {!isActive && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
               <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
            </div>
          )}
        </div>

        <div className="text-center z-10">
          <h3 className="text-xl font-bold text-slate-100">{isActive ? persona : "Interview Station Ready"}</h3>
          {isActive ? (
            <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center space-x-2 ${isVideoActive ? 'text-blue-400' : 'text-emerald-400'}`}>
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isVideoActive ? 'bg-blue-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isVideoActive ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
              </span>
              <span>{isVideoActive ? "Analyzing Audio & Video" : "Analyzing Voice Input"}</span>
            </div>
          ) : (
            <p className="text-slate-500 text-xs mt-1">{useCamera ? "Camera enabled for visual analysis." : "Camera disabled (Voice-only mode)."}</p>
          )}
        </div>

        <div className={`w-full max-w-lg min-h-[100px] bg-slate-950/60 border border-slate-800 rounded-2xl p-6 transition-all shadow-inner backdrop-blur-md ${currentModelText ? 'opacity-100' : 'opacity-40'}`}>
          <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center">
            <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            Interviewer Response
          </div>
          <div className="text-slate-200 text-sm leading-relaxed font-medium italic">
            {currentModelText || (isActive ? "The interviewer is processing..." : "Initialize to begin your session.")}
          </div>
        </div>

        <div className="flex space-x-4 z-10">
          {!isActive ? (
            <button 
              onClick={startSession} 
              className="px-12 py-4 bg-blue-600 text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/30 hover:scale-105 active:scale-95"
            >
              Start Practice
            </button>
          ) : (
            <button 
              onClick={endSession} 
              className="px-12 py-4 bg-red-600 text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-900/30 hover:scale-105 active:scale-95"
            >
              Finish Early
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-full flex flex-col shadow-xl">
           <div className="flex items-center justify-between mb-6">
             <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest flex items-center">
               <svg className="w-4 h-4 mr-2 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" /></svg>
               Session Strategy
             </h4>
             <span className="text-[10px] font-black text-slate-700">V2.8</span>
           </div>
           <div className="space-y-6">
              <div className="bg-blue-600/5 p-5 rounded-2xl border border-blue-500/10 shadow-sm">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-blue-400">Current Mode:</strong> {useCamera ? "Standard Interview (Full Analysis)" : "Privacy/Phone Screen (Voice Only)"}.
                </p>
              </div>
              
              <div className="pt-2">
                <div className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center">
                   <span className="w-4 h-px bg-slate-800 mr-2" />
                   Checklist
                </div>
                <ul className="space-y-4">
                  {preInterviewTips.map((tip, i) => (
                    <li key={i} className="flex space-x-4 items-start group">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-200">{tip.title}</div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{tip.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {isActive && (
                <div className="mt-auto pt-6 animate-in slide-in-from-bottom duration-500">
                   <div className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl shadow-sm">
                      <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                        Context Insight
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        {isVideoActive 
                          ? "Body language matters. Maintain professional eye contact with the camera."
                          : "Voice projection is key. Ensure you sound confident and clear."
                        }
                      </p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
      {error && (
        <div className="lg:col-span-3 bg-red-600/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-xs text-center font-bold">
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveSession;
