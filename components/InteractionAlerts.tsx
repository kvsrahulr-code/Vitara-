
import React from 'react';
import { InteractionAlert } from '../types';
import { AlertTriangle, Info } from 'lucide-react';

interface InteractionAlertsProps {
  alerts: InteractionAlert[];
  isLoading: boolean;
}

export const InteractionAlerts: React.FC<InteractionAlertsProps> = ({ alerts, isLoading }) => {
  if (isLoading) {
    return (
      <div className="glass-panel p-4 rounded-2xl animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={20} />
          AI Safety Check
        </h3>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">Powered by Gemini 2.5 Pro</span>
      </div>
      
      {alerts.map((alert, idx) => (
        <div 
          key={idx}
          className={`p-4 rounded-2xl border ${
            alert.severity === 'high' ? 'bg-red-50 border-red-100 text-red-900' :
            alert.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-900' :
            'bg-blue-50 border-blue-100 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${
              alert.severity === 'high' ? 'text-red-600' :
              alert.severity === 'medium' ? 'text-amber-600' :
              'text-blue-600'
            }`}>
              <Info size={18} />
            </div>
            <div>
              <p className="font-bold text-sm mb-1">
                {alert.drugs.join(' + ')} Interaction
              </p>
              <p className="text-xs mb-2 opacity-80">{alert.description}</p>
              <div className="bg-white/50 p-2 rounded-lg text-xs font-semibold">
                Tip: {alert.recommendation}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
