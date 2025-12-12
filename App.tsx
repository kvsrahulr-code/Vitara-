import React, { useState, useEffect, useRef } from 'react';
import { Medication, InteractionAlert, UserProfile } from './types';
import { MedicationCard } from './components/MedicationCard';
import { AddMedication } from './components/AddMedication';
import { AIAssistant } from './components/AIAssistant';
import { InteractionAlerts } from './components/InteractionAlerts';
import { Onboarding } from './components/Onboarding';
import { VitaraAvatar } from './components/VitaraAvatar';
import { ReminderNotification } from './components/ReminderNotification';
import { Button } from './components/Button';
import { checkInteractions, suggestMedicationDetails } from './services/geminiService';
import { Plus, LayoutDashboard, Calendar, Bell, Settings, Pill, LogOut, AlertCircle, Sparkles, RotateCcw, Mic, Search, Utensils, Clock, ChevronRight, Brain } from 'lucide-react';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('vitara_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('vitara_meds');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alerts, setAlerts] = useState<InteractionAlert[]>([]);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'all'>('daily');
  
  // Smart Input State
  const [smartInput, setSmartInput] = useState('');
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Reminder State
  const [activeReminder, setActiveReminder] = useState<Medication | null>(null);

  useEffect(() => {
    localStorage.setItem('vitara_meds', JSON.stringify(medications));
    const performSafetyCheck = async () => {
      if (medications.length >= 2) {
        setIsCheckingAlerts(true);
        const newAlerts = await checkInteractions(medications);
        setAlerts(newAlerts);
        setIsCheckingAlerts(false);
      } else {
        setAlerts([]);
      }
    };
    performSafetyCheck();
  }, [medications]);

  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onresult = (e: any) => setSmartInput(e.results[0][0].transcript);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleSmartSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smartInput.trim() || !userProfile) return;
    setIsSmartLoading(true);
    try {
      const suggestion = await suggestMedicationDetails(smartInput, userProfile);
      setEditingMedication({
        id: Math.random().toString(36).substr(2, 9),
        name: suggestion.name || '',
        dosage: suggestion.dosage || '',
        frequency: suggestion.frequency || 'Once Daily',
        timeOfDay: ['Morning'],
        reminderTimes: suggestion.reminderTimes || ['09:00'],
        intakeAdvice: suggestion.intakeAdvice || '',
        color: '#4f46e5',
        remainingPills: 30,
        totalPills: 30,
        startDate: new Date().toISOString().split('T')[0],
        takenToday: false
      });
      setSmartInput('');
      setShowAddModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSmartLoading(false);
    }
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('vitara_user_profile', JSON.stringify(profile));
  };

  const handleAddMedication = (med: Medication) => {
    if (medications.find(m => m.id === med.id)) {
      setMedications(prev => prev.map(m => m.id === med.id ? med : m));
    } else {
      setMedications(prev => [...prev, med]);
    }
    setEditingMedication(null);
    setShowAddModal(false);
  };

  const handleTakeMedication = (id: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, takenToday: true, remainingPills: Math.max(0, m.remainingPills - 1) } : m));
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getTimelineMeds = (meal: string) => {
    return medications.filter(m => m.intakeAdvice.toLowerCase().includes(meal.toLowerCase()));
  };

  const handleResetApp = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!userProfile) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-20 bg-[#f8fafc]">
      {activeReminder && <ReminderNotification medication={activeReminder} onTake={handleTakeMedication} onDismiss={() => setActiveReminder(null)} />}

      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-[45] px-4 md:px-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <VitaraAvatar />
          <div className="flex flex-col">
            <span className="text-xl font-black text-indigo-900 tracking-wider leading-none">VITARA</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mt-0.5">AI Health Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
            <Sparkles size={12} className="text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Gemini 2.5 Pro Active</span>
          </div>
          <button onClick={() => setShowResetConfirm(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Settings size={20}/></button>
        </div>
      </header>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">Reset App Data?</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">This will delete all medications and profile information permanently.</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowResetConfirm(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleResetApp} className="flex-1">Reset</Button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full md:w-20 md:h-screen bg-white border-t md:border-t-0 md:border-r border-gray-100 flex md:flex-col items-center justify-around md:justify-center gap-8 py-4 z-40 pt-20">
        <button onClick={() => setActiveTab('daily')} className={`p-3 rounded-2xl transition-all ${activeTab === 'daily' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={24} /></button>
        <button onClick={() => setActiveTab('all')} className={`p-3 rounded-2xl transition-all ${activeTab === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}><Pill size={24} /></button>
        <button className="p-3 rounded-2xl text-gray-400 hover:bg-gray-50"><Calendar size={24} /></button>
        <button className="p-3 rounded-2xl text-gray-400 hover:bg-gray-50 md:mt-auto"><Bell size={24} /></button>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-10 pt-28">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">{getTimeGreeting()}, {userProfile.name.split(' ')[0]}</h1>
          <p className="text-slate-500 font-medium">Your AI-powered health schedule is up to date.</p>
        </div>

        {/* AI Quick Add Bar - Improved Contrast */}
        <section className="mb-10">
          <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-indigo-100/30 flex flex-col md:flex-row items-center gap-2 border border-slate-100">
            <div className="flex-1 w-full relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500"><Brain size={22} /></div>
              <form onSubmit={handleSmartSubmit}>
                <input 
                  className="w-full pl-16 pr-12 py-5 bg-slate-50 rounded-[1.5rem] text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400" 
                  placeholder="Tell me what you're taking or ask a question..."
                  value={smartInput}
                  onChange={e => setSmartInput(e.target.value)}
                />
              </form>
              <button 
                onClick={() => { setIsListening(true); recognitionRef.current?.start(); }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-400 hover:bg-indigo-50'}`}
              ><Mic size={20} /></button>
            </div>
            <Button 
              onClick={handleSmartSubmit}
              isLoading={isSmartLoading}
              className="w-full md:w-auto px-10 py-5 rounded-[1.5rem] shadow-lg shadow-indigo-200 text-base font-black"
            >Analyze with Gemini</Button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2"><Clock size={20} className="text-indigo-600" /> Daily Timeline</h2>
            {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
              <div key={meal} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Utensils size={18} /></div>
                    <span className="font-black text-slate-800">{meal} Intake</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="space-y-3">
                  {getTimelineMeds(meal).length > 0 ? (
                    getTimelineMeds(meal).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-black text-slate-700">{m.name}</span>
                        <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg text-indigo-600 shadow-sm">{m.reminderTimes[0]}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold">No medications scheduled.</p>
                  )}
                </div>
              </div>
            ))}
            <InteractionAlerts alerts={alerts} isLoading={isCheckingAlerts} />
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800">{activeTab === 'daily' ? "Today's Schedule" : "All Medications"}</h2>
              <button onClick={() => { setEditingMedication(null); setShowAddModal(true); }} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><Plus size={24} /></button>
            </div>
            {medications.length === 0 ? (
              <div className="text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
                <Pill size={48} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-400">Your cabinet is empty.</h3>
                <p className="text-sm text-slate-300 font-medium mt-2">Use the AI bar above to add your first medicine.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeTab === 'daily' ? medications.filter(m => !m.takenToday) : medications).map(med => (
                  <MedicationCard 
                    key={med.id} medication={med} 
                    onTake={handleTakeMedication} 
                    onDelete={id => setMedications(prev => prev.filter(m => m.id !== id))}
                    onEdit={m => { setEditingMedication(m); setShowAddModal(true); }}
                    onRefill={id => setMedications(prev => prev.map(m => m.id === id ? { ...m, remainingPills: m.totalPills } : m))}
                  />
                ))}
              </div>
            )}
            
            {activeTab === 'all' && medications.length > 0 && (
              <div className="mt-10 p-8 bg-indigo-600 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-indigo-200">
                <div className="p-4 bg-white/20 rounded-[2rem]"><Search size={32} /></div>
                <div className="flex-1">
                  <h3 className="text-xl font-black mb-1">Generate AI Medication Guide</h3>
                  <p className="text-indigo-100 font-medium text-sm">Get a comprehensive PDF-style summary of your dosage, interactions, and advice.</p>
                </div>
                <Button 
                  onClick={() => { setSmartInput("Create a comprehensive medication guide for me."); handleSmartSubmit(); }}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-black px-8 py-4 rounded-2xl"
                >
                  Create Guide
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddModal && <AddMedication onAdd={handleAddMedication} onClose={() => { setShowAddModal(false); setEditingMedication(null); }} initialData={editingMedication} />}
      <AIAssistant 
        userProfile={userProfile} 
        medications={medications} 
        onSetReminder={(medData) => {
          setEditingMedication(medData as Medication);
          setShowAddModal(true);
        }}
        onCreateGuide={() => {
           setSmartInput("Create a comprehensive medication guide for me.");
           handleSmartSubmit();
        }}
      />
    </div>
  );
};

export default App;
