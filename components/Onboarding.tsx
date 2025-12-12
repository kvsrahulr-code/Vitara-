import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Button } from './Button';
import { User, Calendar, Activity, ArrowRight, ArrowLeft, AlertCircle, History, UserCheck, PlusCircle } from 'lucide-react';
import { VitaraAvatar } from './VitaraAvatar';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [profileHistory, setProfileHistory] = useState<UserProfile[]>([]);
  
  const [name, setName] = useState('');
  
  // Custom Date Selectors
  const currentYear = new Date().getFullYear();
  const [birthDay, setBirthDay] = useState('1');
  const [birthMonth, setBirthMonth] = useState('January');
  const [birthYear, setBirthYear] = useState((currentYear - 25).toString());
  
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Prefer not to say');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const historyJson = localStorage.getItem('vitara_profiles_history');
    if (historyJson) {
      setProfileHistory(JSON.parse(historyJson));
    }
  }, []);

  // Calculate age and validate
  useEffect(() => {
    const monthIndex = MONTHS.indexOf(birthMonth);
    const dob = new Date(parseInt(birthYear), monthIndex, parseInt(birthDay));
    const today = new Date();
    
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    
    setAge(calculatedAge);

    if (calculatedAge < 12) {
      setError("You must be at least 12 years old to use Vitara.");
    } else if (calculatedAge > 100) {
      setError("Please enter a valid birth year (limit 100 years).");
    } else {
      setError(null);
    }
  }, [birthDay, birthMonth, birthYear]);

  const handleNameChange = (val: string) => {
    const filtered = val.replace(/[^a-zA-Z\s]/g, '');
    setName(filtered);
  };

  const nextStep = () => {
    if (!error && name.trim().length > 0) {
      setStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && !error && age >= 12 && age <= 100) {
      const monthIdx = (MONTHS.indexOf(birthMonth) + 1).toString().padStart(2, '0');
      const dayStr = birthDay.padStart(2, '0');
      const dobString = `${birthYear}-${monthIdx}-${dayStr}`;
      
      onComplete({
        name,
        dob: dobString,
        age,
        gender,
        height,
        weight,
      });
    }
  };

  const handleSelectExisting = (profile: UserProfile) => {
    onComplete(profile);
  };

  const isStep1Valid = name.trim().length > 1 && !error;
  const hasHistory = profileHistory.length > 0;

  return (
    <div className="fixed inset-0 z-[100] bg-indigo-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="relative w-full max-w-lg glass-panel p-8 md:p-12 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-500 text-gray-900 bg-white max-h-[90vh] overflow-y-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">V</div>
              <VitaraAvatar />
            </div>
            <div className="flex gap-1">
              {[1, 2].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-indigo-600' : 'w-2 bg-gray-200'}`} 
                />
              ))}
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-gray-900">
            {step === 1 ? "Welcome to Vitara" : "Physical Details"}
          </h1>
          <p className="text-gray-500 font-medium">
            {step === 1 
              ? "Let's personalize your medication journey." 
              : "Optional info to help our AI better understand your health context."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
              
              {/* Profile History Section */}
              {hasHistory && !isCreatingNew && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                    <History size={14} /> Continue with existing profile
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {profileHistory.map((profile, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectExisting(profile)}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                            {profile.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-indigo-600">{profile.name}</div>
                            <div className="text-xs text-gray-400 font-medium">{profile.age} years • {profile.gender}</div>
                          </div>
                        </div>
                        <UserCheck className="text-gray-300 group-hover:text-indigo-600" size={20} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 text-gray-500 font-bold text-sm transition-all"
                    >
                      <PlusCircle size={18} /> Or create a new account
                    </button>
                  </div>
                </div>
              )}

              {(isCreatingNew || !hasHistory) && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {hasHistory && (
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingNew(false)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-2"
                    >
                      <ArrowLeft size={12} /> Back to profiles
                    </button>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={16} className="text-indigo-600" /> Full Name
                    </label>
                    <input 
                      required
                      autoFocus
                      className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-medium placeholder:text-gray-300"
                      placeholder="Only alphabets allowed"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600" /> Date of Birth
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select 
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        className="px-3 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 outline-none font-medium"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <select 
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        className="px-3 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 outline-none font-medium"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        className="px-3 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 outline-none font-medium"
                      >
                        {Array.from({ length: 100 }, (_, i) => currentYear - i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        Age: {age}
                      </span>
                      {error && (
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} /> {error}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Activity size={16} className="text-indigo-600" /> Gender Identity
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g as any)}
                          className={`py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                            gender === g 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                              : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-200'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={!isStep1Valid}
                    className="w-full h-16 text-lg rounded-2xl shadow-indigo-200 mt-4"
                  >
                    Next <ArrowRight size={20} />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-10 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Height (optional)</label>
                  <input 
                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 outline-none transition-all text-lg font-medium placeholder:text-gray-300"
                    placeholder="e.g. 180cm"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Weight (optional)</label>
                  <input 
                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-indigo-500 outline-none transition-all text-lg font-medium placeholder:text-gray-300"
                    placeholder="e.g. 75kg"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                  Your profile details help Vitara AI provide more accurate health insights and safer dosage warnings.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={prevStep} 
                  className="flex-1 h-16 text-lg rounded-2xl"
                >
                  <ArrowLeft size={20} /> Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-16 text-lg rounded-2xl shadow-indigo-200"
                >
                  Create Profile
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};