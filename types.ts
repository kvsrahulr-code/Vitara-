export interface UserProfile {
  name: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  height?: string;
  weight?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: ('Morning' | 'Afternoon' | 'Evening' | 'Night')[];
  reminderTimes: string[]; // e.g., ["08:00", "20:00"]
  intakeAdvice: string;    // e.g., "Take with food after breakfast"
  color: string;
  notes?: string;
  remainingPills: number;
  totalPills: number;
  startDate: string;
  takenToday?: boolean;
  lastReminderSent?: string; // date string to prevent double notifications
}

export interface InteractionAlert {
  severity: 'low' | 'medium' | 'high';
  drugs: string[];
  description: string;
  recommendation: string;
}

export interface LogEntry {
  id: string;
  medicationId: string;
  timestamp: string;
  status: 'taken' | 'skipped' | 'missed';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface PrescriptionAnalysis {
  medications: Partial<Medication>[];
  comprehensiveGuide: string;
}