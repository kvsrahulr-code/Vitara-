
import { GoogleGenAI, Type, GenerateContentResponse, Modality, FunctionDeclaration } from "@google/genai";
import { Medication, InteractionAlert, PrescriptionAnalysis, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Tool definitions for Vitara Pro to interact with the app state.
 */
const createMedicationGuideTool: FunctionDeclaration = {
  name: 'create_medication_guide',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates a comprehensive summary and guide for all current medications.',
    properties: {
      includeInteractions: { type: Type.BOOLEAN, description: 'Whether to include detailed drug interaction safety checks.' },
      format: { type: Type.STRING, description: 'The desired format: "summary" or "detailed".' }
    },
    required: ['includeInteractions', 'format']
  }
};

const setMedicationReminderTool: FunctionDeclaration = {
  name: 'set_medication_reminder',
  parameters: {
    type: Type.OBJECT,
    description: 'Sets a new medication reminder or adjusts an existing one.',
    properties: {
      name: { type: Type.STRING, description: 'Name of the medication' },
      dosage: { type: Type.STRING, description: 'Dosage amount (e.g. 500mg)' },
      time: { type: Type.STRING, description: 'Time in 24h format (e.g. 08:30)' },
      advice: { type: Type.STRING, description: 'Instructions (e.g. "take with food")' }
    },
    required: ['name', 'dosage', 'time']
  }
};

export const analyzeMedicationImage = async (base64Image: string, isPrescription: boolean = false): Promise<PrescriptionAnalysis> => {
  const model = 'gemini-2.5-pro';
  const prompt = `Analyze this medication image. Extract medications with dosage, frequency, suggested HH:MM times, and intake advice (specifically if it should be with Breakfast, Lunch, or Dinner). Return JSON.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          medications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dosage: { type: Type.STRING },
                frequency: { type: Type.STRING },
                intakeAdvice: { type: Type.STRING },
                suggestedTimes: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          comprehensiveGuide: { type: Type.STRING }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{"medications": []}');
    data.medications = data.medications.map((m: any) => ({
      ...m,
      reminderTimes: m.suggestedTimes || ["09:00"]
    }));
    return data;
  } catch (e) {
    return { medications: [], comprehensiveGuide: "Error parsing." };
  }
};

export const suggestMedicationDetails = async (description: string, profile: UserProfile): Promise<Partial<Medication> & { safetyNote?: string, timelineAdvice?: string }> => {
  const model = 'gemini-2.5-pro';
  const prompt = `User description: "${description}". User Profile: Age ${profile.age}, Gender ${profile.gender}.
  Act as "Jane & May", specialized medical AI assistants. Your job is to fill in the gaps for the user.
  1. Identify the Medication & Dosage from the description.
  2. Create a medication timeline (e.g., "Take at 8:00 AM with Breakfast").
  3. Tell the user if this is generally appropriate for them or if they should be cautious based on their profile.
  4. Specify meal association clearly in intakeAdvice: Breakfast, Lunch, or Dinner.
  Return JSON.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage: { type: Type.STRING },
          frequency: { type: Type.STRING },
          intakeAdvice: { type: Type.STRING },
          reminderTimes: { type: Type.ARRAY, items: { type: Type.STRING } },
          safetyNote: { type: Type.STRING },
          timelineAdvice: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return {};
  }
};

export const checkInteractions = async (medications: Medication[]): Promise<InteractionAlert[]> => {
  if (medications.length < 2) return [];
  const medsList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [{ parts: [{ text: `Check interactions for: ${medsList}. Return JSON.` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING },
            drugs: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          }
        }
      }
    }
  });
  try { return JSON.parse(response.text || '[]'); } catch (e) { return []; }
};

export const chatWithHealthAssistant = async (
  history: any[], 
  message: string, 
  context: { profile: UserProfile, medications: Medication[] },
  useGrounding: boolean = false, 
  useThinking: boolean = false
) => {
  const model = useThinking ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const medContext = context.medications.map(m => `- ${m.name} (${m.dosage}): ${m.intakeAdvice}`).join('\n');
  const systemInstruction = `You are Vitara Health Assistant, an expert medical intelligence. 
  You have FULL ACCESS to the user's profile and current medications.
  
  User Profile:
  - Name: ${context.profile.name}
  - Age: ${context.profile.age}
  - Gender: ${context.profile.gender}
  
  Current Cabinet:
  ${medContext || 'None.'}
  
  If the user asks to "set a reminder", use the set_medication_reminder tool.
  If the user asks for a "medication guide" or "summary", use the create_medication_guide tool.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      ...history.map((h: any) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      // Fix: Google Search cannot be combined with function calling tools.
      ...(useGrounding 
        ? { tools: [{ googleSearch: {} }] } 
        : { tools: [{ functionDeclarations: [createMedicationGuideTool, setMedicationReminderTool] }] }
      ),
      ...(useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {})
    }
  });

  return { 
    text: response.text || "",
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    toolCalls: response.functionCalls
  };
};

export const generateSpeech = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { return undefined; }
};

export const connectLive = (callbacks: any) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      systemInstruction: 'You are Vitara Live Health Assistant.',
    }
  });
};
