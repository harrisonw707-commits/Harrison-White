
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
  scenarioQuestions = [],
  onEnd 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [currentModelText, setCurrentModelText] = useState("");
  const [currentUserText, setCurrentUserText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const frameIntervalRef = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);

  const startSession = async () => {
    setError(null);
    try {
      // 1. Setup Media Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: useCamera ? { width: 640, height: 480 } : false 
      });
      
      if (useCamera && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Setup Recording
      const mimeType = useCamera ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.start();

      // 3. Setup Audio Processing (PCM 16k for Input, 24k for Output)
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // CRITICAL: Resume contexts after user gesture
      await audioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      const micSource = audioContextRef.current.createMediaStreamSource(stream);

      // 4. Initialize Live Session
      const getVoiceName = (p: InterviewerPersona) => {
        switch (p) {
          case InterviewerPersona.STRICT: return 'Charon';
          case InterviewerPersona.EXPERT: return 'Fenrir';
          case InterviewerPersona.DYNAMIC: return 'Puck';
          default: return 'Zephyr';
        }
      };

      const systemInstruction = `You are an expert interviewer for a ${role} position at ${company}. 
      Current Persona: ${persona}.
      Interview Difficulty: ${difficulty}.
      Theme: ${type}.
      Target Questions: ${scenarioQuestions.join(', ')}.
      
      RULES:
      - Be direct and professional. 
      - Adjust your tone based on your assigned persona.
      - If the candidate stops speaking, ask follow-up questions.
      - Final question MUST be: "Describe yourself in one word."`;

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
              const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            micSource.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);

            if (useCamera) {
              const captureCanvas = document.createElement('canvas');
              const ctx = captureCanvas.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (videoRef.current && ctx) {
                  captureCanvas.width = 320;
                  captureCanvas.height = 240;
                  ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                  const base64 = captureCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
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
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const dataInt16 = new Int16Array(bytes.buffer);
              const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
              const chan = buffer.getChannelData(0);
              for (let i = 0; i < dataInt16.length; i++) chan[i] = dataInt16[i] / 32768.0;
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onerror: (e) => {
            console.error("Live Session Error:", e);
            setError("Connection disrupted. Please check your network and refresh.");
          },
          onclose: () => setIsActive(false)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      console.error("Setup Error:", err);
      setError("Permissions denied. Ensure microphone and camera access are enabled in browser settings."); 
    }
  };

  const endSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const type = useCamera ? 'video/webm' : 'audio/webm';
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
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {isActive && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
        )}
        
        <div className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full border-4 transition-all duration-700 ${isActive ? 'border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : 'border-slate-800'}`}>
           {useCamera ? (
             <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-full grayscale-[20%]" />
           ) : (
             <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-slate-700">
                <svg className={`w-24 h-24 ${isActive ? 'text-red-500 animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             </div>
           )}
           {isActive && (
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-[10px] font-black uppercase rounded-full tracking-widest text-white shadow-lg">Live</div>
           )}
        </div>

        <div className="mt-8 text-center space-y-2">
           <h3 className="text-2xl font-black text-slate-100">{isActive ? persona : "Ready to Begin"}</h3>
           <p className="text-sm text-slate-500 max-w-sm">
             {isActive ? "Speak naturally. The interviewer is listening and observing." : "Position yourself in front of the camera and microphone."}
           </p>
        </div>

        <div className={`mt-8 w-full max-w-2xl min-h-[100px] bg-slate-950/60 border border-slate-800 rounded-3xl p-6 transition-all ${currentModelText ? 'opacity-100' : 'opacity-40'}`}>
           <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Interviewer Voice</div>
           <div className="text-slate-200 text-sm leading-relaxed font-medium italic">
             {currentModelText || (isActive ? "Awaiting your first word..." : "Connect to start.")}
           </div>
        </div>

        <div className="mt-12">
          {!isActive ? (
            <button 
              onClick={startSession} 
              className="px-16 py-5 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-sm shadow-2xl shadow-red-900/40 hover:bg-red-700 hover:scale-105 transition-all active:scale-95"
            >
              Connect Now
            </button>
          ) : (
            <button 
              onClick={endSession} 
              className="px-16 py-5 bg-slate-800 text-red-500 border border-red-500/20 rounded-full font-black uppercase tracking-widest text-sm hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              End Session
            </button>
          )}
        </div>

        {error && <div className="mt-6 text-xs font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">{error}</div>}
      </div>
    </div>
  );
};

export default LiveSession;
