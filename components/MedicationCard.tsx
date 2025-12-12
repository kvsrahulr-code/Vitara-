
import React from 'react';
import { Medication } from '../types';
import { Check, Clock, Package, Edit2, CheckCircle, Utensils, Sun, Moon, Sunset } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onTake: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (med: Medication) => void;
  onRefill: (id: string) => void;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onTake, onDelete, onEdit, onRefill }) => {
  const stockLevel = (medication.remainingPills / medication.totalPills) * 100;
  const isLowStock = stockLevel < 20;

  const getTimeIcon = (time: string) => {
    const lowerTime = time.toLowerCase();
    if (lowerTime.includes('morning')) return <Sun size={14} className="text-amber-500" />;
    if (lowerTime.includes('afternoon')) return <Sun size={14} className="text-orange-400" />;
    if (lowerTime.includes('evening')) return <Sunset size={14} className="text-indigo-400" />;
    if (lowerTime.includes('night')) return <Moon size={14} className="text-blue-600" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  return (
    <div className={`glass-panel p-6 rounded-[2.5rem] shadow-sm hover:shadow-lg transition-all group relative border-2 ${medication.takenToday ? 'border-emerald-100 bg-emerald-50/20 shadow-emerald-50' : 'border-transparent'}`}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={() => onEdit(medication)}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          title="Edit/Reschedule"
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={() => onDelete(medication.id)}
          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex items-start gap-5 mb-6">
        <div 
          className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner transition-all ${medication.takenToday ? 'bg-emerald-500 text-white' : ''}`}
          style={!medication.takenToday ? { backgroundColor: `${medication.color}20`, color: medication.color } : {}}
        >
          {medication.takenToday ? <Check size={28} /> : '💊'}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-xl tracking-tight leading-tight">{medication.name}</h3>
          <p className="text-gray-500 text-sm font-bold flex items-center gap-2">
            {medication.dosage} • {medication.frequency}
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {/* Alarm Clock & Times Section */}
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-indigo-600" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Scheduled Alarms</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {medication.reminderTimes && medication.reminderTimes.length > 0 ? (
              medication.reminderTimes.map((time, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <span className="text-sm font-black text-indigo-700">{time}</span>
                  <div className="flex items-center gap-1">
                    {medication.timeOfDay?.[idx] && getTimeIcon(medication.timeOfDay[idx])}
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-400 font-bold">No alarms set</span>
            )}
          </div>
        </div>
        
        {/* Intake Advice Section */}
        <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Utensils size={16} className="text-emerald-600" />
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">How to Take</span>
          </div>
          <p className="text-sm font-bold text-indigo-900 leading-relaxed">
            {medication.intakeAdvice || "Follow standard instructions."}
          </p>
          <div className="flex gap-2 mt-3">
            {medication.intakeAdvice.toLowerCase().includes('breakfast') && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">Breakfast</span>
            )}
            {medication.intakeAdvice.toLowerCase().includes('lunch') && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-lg uppercase">Lunch</span>
            )}
            {medication.intakeAdvice.toLowerCase().includes('dinner') && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg uppercase">Dinner</span>
            )}
          </div>
        </div>

        {/* Stock Inventory Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
            <span className="flex items-center gap-1">
              <Package size={12} className={isLowStock ? 'text-amber-500' : 'text-emerald-500'} />
              Stock Inventory
            </span>
            <button 
              onClick={() => onRefill(medication.id)}
              className="text-indigo-600 hover:underline"
            >
              Refill
            </button>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${isLowStock ? 'bg-amber-500' : 'bg-indigo-600'}`}
              style={{ width: `${stockLevel}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
             <span className={`text-xs font-bold ${isLowStock ? 'text-amber-600' : 'text-gray-500'}`}>
              {medication.remainingPills} / {medication.totalPills} left
            </span>
            {isLowStock && <span className="text-[10px] font-black text-amber-600 animate-pulse">Refill Soon</span>}
          </div>
        </div>
      </div>

      <button 
        onClick={() => onTake(medication.id)}
        disabled={medication.takenToday}
        className={`w-full py-4 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          medication.takenToday 
          ? 'bg-emerald-100 text-emerald-700 shadow-emerald-50 cursor-default' 
          : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5'
        }`}
      >
        {medication.takenToday ? (
          <>
            <CheckCircle size={20} />
            Taken for Today
          </>
        ) : (
          <>
            <Check size={20} />
            Mark as Taken
          </>
        )}
      </button>
    </div>
  );
};
