import React, { useEffect, useState } from 'react';
import { Medication } from '../types';
import { Bell, Pill, X, Check, Volume2, MessageSquareText } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface ReminderNotificationProps {
  medication: Medication;
  onTake: (id: string) => void;
  onDismiss: () => void;
}

export const ReminderNotification: React.FC<ReminderNotificationProps> = ({ medication, onTake, onDismiss }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSimulatedText, setShowSimulatedText] = useState(false);

  const playVoiceReminder = async () => {
    setIsPlaying(true);
    const text = `Hi, it's Vitara. It's time for your ${medication.name}. ${medication.intakeAdvice}. I'll stay here until you take it.`;
    const base64 = await generateSpeech(text);
    
    if (base64) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    playVoiceReminder();
    // Simulate mobile vibration
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }
    // Show simulated text reminder after a short delay
    const timer = setTimeout(() => setShowSimulatedText(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm p-4 space-y-4 animate-in slide-in-from-top-10 duration-500">
      {/* Simulated Text Message */}
      {showSimulatedText && (
        <div className="bg-black/80 backdrop-blur-xl text-white p-4 rounded-[1.5rem] shadow-2xl flex gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <MessageSquareText size={20} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">VITARA SMS</span>
              <span className="text-[10px] font-bold opacity-50">Now</span>
            </div>
            <p className="text-xs font-bold leading-tight">Time for your {medication.name}. Open Vitara to confirm.</p>
          </div>
        </div>
      )}

      {/* Main Reminder Modal */}
      <div className="glass-panel bg-white/95 border-2 border-indigo-500 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center animate-bounce">
                <Bell size={18} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Medication Alert</span>
            </div>
            <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner"
              style={{ backgroundColor: `${medication.color}20`, color: medication.color }}
            >
              💊
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">{medication.name}</h3>
              <p className="text-slate-500 font-black">{medication.dosage}</p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-[1.5rem] p-4 mb-6 border border-indigo-100 flex items-start gap-3">
            <div className={`mt-1 text-indigo-600 ${isPlaying ? 'animate-pulse' : ''}`}>
              <Volume2 size={20} />
            </div>
            <p className="text-sm font-black text-indigo-900 leading-relaxed">
              {medication.intakeAdvice || "Please take your medication as scheduled."}
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => { onTake(medication.id); onDismiss(); }}
              className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
            >
              <Check size={20} /> I've Taken It
            </button>
          </div>
          
          <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest mt-4">
            Voice & Text Reminders Active
          </p>
        </div>
      </div>
    </div>
  );
};
