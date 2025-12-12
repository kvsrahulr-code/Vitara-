
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { chatWithHealthAssistant, generateSpeech, connectLive } from '../services/geminiService';
import { MessageSquare, Send, X, Bot, User, Mic, MicOff, Loader2, Search, Brain, Headphones, Globe, MapPin, ExternalLink, Volume2, Sparkles, Activity } from 'lucide-react';
import { ChatMessage, Medication, UserProfile } from '../types';

interface AIAssistantProps {
  userProfile: UserProfile;
  medications: Medication[];
  onSetReminder?: (med: Partial<Medication>) => void;
  onCreateGuide?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ userProfile, medications, onSetReminder, onCreateGuide }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage & { grounding?: any[] })[]>([
    { role: 'model', text: `Hello ${userProfile.name.split(' ')[0]}! I'm your Vitara Pro Assistant. I have reviewed your ${medications.length} medications. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (e: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => `${prev} ${finalTranscript}`.trim());
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Helper to decode Base64
  const decodeBase64 = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper to encode PCM for Live API
  const encodePCM = (data: Float32Array): string => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const playPCM = async (base64: string) => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    const bytes = decodeBase64(base64);
    const buffer = await decodeAudioData(bytes, ctx, 24000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
  };

  // Added stopLiveMode function to fix missing name error
  const stopLiveMode = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.then((session: any) => session.close());
      liveSessionRef.current = null;
    }
    setIsLiveMode(false);
    for (const source of sourcesRef.current.values()) {
      try { source.stop(); } catch (e) {}
    }
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  // Added startLiveMode function to fix missing name error and handle live session
  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLiveMode(true);
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const sessionPromise = connectLive({
        onopen: () => {
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (audioProcessingEvent: any) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBase64 = encodePCM(inputData);
            sessionPromise.then((session: any) => {
              session.sendRealtimeInput({ media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: any) => {
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(
              decodeBase64(base64EncodedAudioString),
              outputAudioContext,
              24000
            );
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.onended = () => sourcesRef.current.delete(source);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
          }

          if (message.serverContent?.interrupted) {
            for (const source of sourcesRef.current.values()) {
              try { source.stop(); } catch (e) {}
              sourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: any) => {
          console.error('Live mode error:', e);
          stopLiveMode();
        },
        onclose: () => {
          stopLiveMode();
        }
      });
      
      liveSessionRef.current = sessionPromise;
    } catch (err) {
      console.error('Failed to start live mode', err);
      setIsLiveMode(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const result = await chatWithHealthAssistant(
        messages, 
        userMessage, 
        { profile: userProfile, medications }, 
        useGrounding, 
        useThinking
      );

      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const call of result.toolCalls) {
          if (call.name === 'set_medication_reminder' && onSetReminder) {
            onSetReminder({
              name: call.args.name as string,
              dosage: call.args.dosage as string,
              reminderTimes: [call.args.time as string],
              intakeAdvice: call.args.advice as string || ""
            });
            setMessages(prev => [...prev, { role: 'model', text: `Understood. I've prepared a reminder for ${call.args.name}. Opening the setup window now.` }]);
          } else if (call.name === 'create_medication_guide' && onCreateGuide) {
            onCreateGuide();
            setMessages(prev => [...prev, { role: 'model', text: "I've generated your comprehensive medication guide. You can view it now." }]);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: result.text, grounding: result.grounding }]);
        const audio = await generateSpeech(result.text.slice(0, 300)); 
        if (audio) playPCM(audio);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting. Try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl z-[60] hover:scale-110 active:scale-95 flex items-center justify-center transition-all border-4 border-white"
      >
        <MessageSquare size={28} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:items-end md:justify-end md:p-6 p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-[90vw] md:max-w-lg h-[85vh] md:h-[700px] md:w-[450px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 border border-slate-100">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0 z-10 shadow-lg relative">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                 <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[100%] bg-indigo-400 rounded-full blur-3xl animate-pulse" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner"><Bot size={24} /></div>
                <div>
                  <span className="font-black text-lg block leading-none">Vitara Pro</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Medical Intelligence</span>
                </div>
              </div>
              <div className="flex gap-2 relative z-10">
                <button 
                  onClick={isLiveMode ? stopLiveMode : startLiveMode}
                  className={`p-2 rounded-xl transition-all ${isLiveMode ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
                  title="Voice Mode"
                ><Headphones size={20} /></button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={20}/></button>
              </div>
            </div>

            <div className="flex bg-white border-b border-gray-100 p-2 gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button onClick={() => setUseGrounding(!useGrounding)} className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${useGrounding ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Globe size={14} /> Search Web</button>
              <button onClick={() => setUseThinking(!useThinking)} className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${useThinking ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Brain size={14} /> Deep Expert</button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  {msg.grounding && msg.grounding.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.grounding.map((chunk, idx) => {
                        const web = chunk.web || chunk.maps;
                        if (!web) return null;
                        return (
                          <a key={idx} href={web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-[10px] font-black text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm">
                            <ExternalLink size={10}/> {web.title || "Source"}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start">
                  <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex items-center gap-3 shadow-sm">
                    <Activity size={14} className="text-indigo-400 animate-pulse" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {!isLiveMode && (
              <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-3 items-center shrink-0">
                <div className="flex-1 relative">
                  {isListening && (
                    <div className="absolute -top-12 left-0 right-0 flex justify-center">
                       <div className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg animate-bounce flex items-center gap-2">
                         <div className="flex gap-0.5">
                           {[1,2,3,4].map(i => <div key={i} className="w-1 bg-white rounded-full animate-pulse h-2" style={{animationDelay: `${i*0.1}s`}} />)}
                         </div>
                         Listening...
                       </div>
                    </div>
                  )}
                  <input 
                    className="w-full pl-5 pr-12 py-4 bg-slate-100 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-inner" 
                    placeholder="Ask Vitara anything..." 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                  />
                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                  >
                    <Mic size={18} />
                  </button>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-indigo-100 shrink-0 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  <Send size={24} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
