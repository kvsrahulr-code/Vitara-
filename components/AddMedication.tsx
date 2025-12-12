import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { analyzeMedicationImage, suggestMedicationDetails } from '../services/geminiService';
import { Camera, Plus, X, Loader2, FileText, CheckCircle2, Sparkles, AlertCircle, Info, Save, Clock, HelpCircle, Mic, Brain, Utensils, Image as ImageIcon } from 'lucide-react';
import { Medication, PrescriptionAnalysis, UserProfile } from '../types';

interface AddMedicationProps {
  onAdd: (med: Medication) => void;
  onAddMany?: (meds: Medication[]) => void;
  onClose: () => void;
  initialData?: Medication | null;
}

export const AddMedication: React.FC<AddMedicationProps> = ({ onAdd, onAddMany, onClose, initialData }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanType, setActiveScanType] = useState<'label' | 'prescription' | 'description' | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [safetyNote, setSafetyNote] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: 'Once Daily',
    timeOfDay: ['Morning'],
    reminderTimes: ['09:00'],
    intakeAdvice: '',
    color: '#4f46e5',
    remainingPills: 30,
    totalPills: 30,
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const saved = localStorage.getItem('vitara_user_profile');
    if (saved) setUserProfile(JSON.parse(saved));
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      if (initialData.notes) setSafetyNote(initialData.notes);
    }
  }, [initialData]);

  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onresult = (e: any) => setAiDescription(prev => `${prev} ${e.results[0][0].transcript}`.trim());
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const results = await analyzeMedicationImage(base64, activeScanType === 'prescription');
        if (results.medications.length > 0) {
          const firstMed = results.medications[0];
          setFormData(prev => ({
            ...prev,
            name: firstMed.name || prev.name,
            dosage: firstMed.dosage || prev.dosage,
            frequency: firstMed.frequency || prev.frequency,
            intakeAdvice: firstMed.intakeAdvice || prev.intakeAdvice,
            reminderTimes: firstMed.reminderTimes || prev.reminderTimes
          }));
          setSafetyNote(results.comprehensiveGuide || null);
        }
      } catch (err) {
        console.error("Scanning failed", err);
      } finally {
        setIsScanning(false);
        setActiveScanType(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = (type: 'label' | 'prescription') => {
    setActiveScanType(type);
    fileInputRef.current?.click();
  };

  const handleAiSuggest = async () => {
    if (!aiDescription.trim() || !userProfile) return;
    setIsScanning(true);
    setActiveScanType('description');
    try {
      const suggestion = await suggestMedicationDetails(aiDescription, userProfile);
      setFormData(prev => ({
        ...prev,
        name: suggestion.name || prev.name,
        dosage: suggestion.dosage || prev.dosage,
        frequency: suggestion.frequency || prev.frequency,
        intakeAdvice: suggestion.intakeAdvice || prev.intakeAdvice,
        reminderTimes: suggestion.reminderTimes || prev.reminderTimes
      }));
      setSafetyNote(suggestion.safetyNote || null);
      
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
      setActiveScanType(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onAdd({
      ...formData as Medication,
      id: formData.id || Math.random().toString(36).substr(2, 9),
      takenToday: false,
      notes: safetyNote || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />
      
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">{initialData?.id ? 'Adjust Medication' : 'Add Medication'}</h2>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Medical Intelligence Active</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
          {/* AI Toolkit Section */}
          {!initialData?.id && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                <Sparkles size={14} className="text-indigo-500" /> AI Toolkit
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual Intel */}
                <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Camera size={16} className="text-indigo-600" /> Visual Intel
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => triggerFileSelect('label')}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
                    >
                      <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-[10px] font-black uppercase">Scan Label</span>
                    </button>
                    <button 
                      onClick={() => triggerFileSelect('prescription')}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
                    >
                      <FileText size={20} className="text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-[10px] font-black uppercase">Scan Rx</span>
                    </button>
                  </div>
                  {isScanning && (activeScanType === 'label' || activeScanType === 'prescription') && (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 animate-pulse py-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-bold">Analyzing image...</span>
                    </div>
                  )}
                </div>

                {/* Contextual Intel */}
                <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Brain size={16} className="text-indigo-600" /> Describe Info
                  </h4>
                  <div className="relative">
                    <textarea 
                      className="w-full p-4 pr-10 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-[11px] font-semibold h-20 resize-none leading-tight" 
                      placeholder="Jane & May: I'm taking 50mg of..."
                      value={aiDescription}
                      onChange={e => setAiDescription(e.target.value)}
                    />
                    <button onClick={() => { setIsListening(true); recognitionRef.current?.start(); }} className={`absolute bottom-2 right-2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-400 hover:bg-indigo-50'}`}><Mic size={14} /></button>
                  </div>
                  <Button onClick={handleAiSuggest} isLoading={activeScanType === 'description'} className="w-full h-10 text-xs rounded-xl">
                    Fill the Gaps
                  </Button>
                </div>
              </div>
            </div>
          )}

          {safetyNote && (
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1 block">AI Safety Insight</span>
                <p className="text-xs font-bold text-amber-900 leading-relaxed">{safetyNote}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              <FileText size={14} /> Confirmation Form
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Drug Name</label>
                <input required className="w-full px-5 py-3 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Amoxicillin" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Dosage</label>
                <input required className="w-full px-5 py-3 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} placeholder="e.g. 500mg" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} /> Intake Window & Advice</label>
              <textarea className="w-full px-5 py-3 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm h-24 transition-all" value={formData.intakeAdvice} onChange={e => setFormData({ ...formData, intakeAdvice: e.target.value })} placeholder="e.g. Take with breakfast to reduce nausea..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Reminder Time</label>
                <input type="time" className="w-full px-5 py-3 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" value={formData.reminderTimes?.[0]} onChange={e => setFormData({ ...formData, reminderTimes: [e.target.value] })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                <select className="w-full px-5 py-3 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                  <option>Once Daily</option>
                  <option>Twice Daily</option>
                  <option>Three Times Daily</option>
                  <option>As Needed</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 text-lg rounded-[1.25rem] shadow-xl shadow-indigo-100 mt-4 mb-8">
              {initialData?.id ? <><Save size={20} /> Save Changes</> : <><CheckCircle2 size={20} /> Add to Cabinet</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};