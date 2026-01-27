
export enum InterviewDifficulty {
  EASY = 'Entry Level',
  MEDIUM = 'Experienced / Lead',
  HARD = 'Manager / Supervisor'
}

export enum InterviewType {
  BEHAVIORAL = 'Behavioral',
  TECHNICAL = 'Skills & Safety',
  CULTURAL = 'Work ethic'
}

export enum InterviewerPersona {
  FRIENDLY = 'Friendly Mentor',
  STRICT = 'Strict Manager',
  EXPERT = 'Technical Expert',
  DYNAMIC = 'Dynamic Professional'
}

export interface InterviewScenario {
  interviewerName: string;
  interviewerTitle: string;
  companyDescription: string;
  questions: string[];
  preInterviewTips: { title: string; content: string }[];
  candidateQuestionsToAsk: { q: string; reason: string }[];
  candidateQuestionsToAvoid: { q: string; reason: string }[];
}

export interface SkillsGapAnalysis {
  readinessScore: number;
  missingSkills: string[];
  suggestedFocus: string;
  matchingStrengths: string[];
}

export interface CoachingTip {
  title: string;
  content: string;
  category: 'Communication' | 'Technical' | 'Strategic' | 'Visual';
}

export interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  coachingTips: CoachingTip[];
  metrics: {
    pacing: { score: number; label: string; details: string };
    fillerWords: { 
      score: number; 
      countDescription: string; 
      details: string;
      breakdown: { word: string; count: number }[];
    };
    conciseness: { score: number; label: string; details: string };
    clarity: { score: number; label: string; details: string };
    visual?: {
      eyeContact: { score: number; label: string };
      posture: { score: number; label: string };
      gestures: { score: number; label: string };
    };
  };
}

export interface InterviewSession {
  id: string;
  role: string;
  company: string;
  difficulty: InterviewDifficulty;
  type: InterviewType;
  persona: InterviewerPersona;
  timestamp: number;
  transcription: string[];
  feedback: InterviewFeedback;
  videoUrl?: string;
  scenario?: InterviewScenario;
}
