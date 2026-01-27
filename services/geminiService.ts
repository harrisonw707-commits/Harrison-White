
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewerPersona } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeSkillsGap = async (resume: string, jd: string, role: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Compare this resume against the job description for a ${role} position.
    Resume: ${resume}
    Job Description: ${jd}
    
    Identify:
    1. A readiness score (0-100)
    2. Missing key skills or certifications mentioned in the JD but not the resume.
    3. Suggested focus area for an interview.
    4. Matching strengths.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          readinessScore: { type: Type.NUMBER },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedFocus: { type: Type.STRING },
          matchingStrengths: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['readinessScore', 'missingSkills', 'suggestedFocus', 'matchingStrengths']
      }
    }
  });
  return JSON.parse(response.text);
};

export const fetchIndustryTrends = async (role: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search for the latest 2024-2025 industry trends, hiring news, and required skill shifts for the role of "${role}". 
    Provide 3 concise insights that would help a candidate stand out in an interview.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = chunks.map((c: any) => ({
    title: c.web?.title || 'Industry Source',
    uri: c.web?.uri || '#'
  })).filter((l: any) => l.uri !== '#');

  return {
    text: response.text,
    sources: links.slice(0, 3)
  };
};

export const searchLiveJobs = async (role: string, company: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find 3 real-world, currently active job openings for a "${role}" position. 
    For each job, try to find metadata about how many people have applied (e.g., "50+ applicants") or how recent it is (e.g., "Posted 2 hours ago"). 
    If you find applicant counts or popularity info, include it clearly.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = chunks.map((c: any) => ({
    title: c.web?.title || 'Job Posting',
    uri: c.web?.uri || '#',
    snippet: c.web?.title || ''
  })).filter((l: any) => l.uri !== '#');

  return {
    text: response.text,
    links: links.slice(0, 3)
  };
};

export const analyzeInterviewFeedback = async (transcription: string[], role: string, resume: string = '', jd: string = '') => {
  const ai = getAI();
  const transcriptText = transcription.join('\n');
  
  const candidateLines = transcription.filter(line => line.startsWith('You:'));
  const candidateText = candidateLines.map(line => line.replace('You:', '').trim()).join(' ');
  const candidateWordCount = candidateText.split(/\s+/).filter(word => word.length > 0).length;
  const turnsCount = candidateLines.length;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `ACT AS A BRUTALLY HONEST, ELITE EXECUTIVE RECRUITER. 
    Analyze this interview transcript for a ${role} position. 
    
    CRITICAL REALISM PROTOCOL:
    1. THE "DEAD AIR" PENALTY: If the candidate spoke fewer than 20 words across the entire session, the score MUST be 0. Do not hallucinate strengths.
    2. THE "PREMATURE TERMINATION" PENALTY: If the session ended after fewer than 3 exchanges (Candidate Turns: ${turnsCount}), the score CANNOT exceed 15/100.
    3. THE "INTERJECTION" RULE: If the candidate gave 1-word or 2-word answers (e.g. "yes", "no", "okay") more than 50% of the time, penalize 'Conciseness' (which in this context means 'too brief') and 'Clarity' heavily.
    4. NO MERCY FOR SILENCE: If 'METADATA: Candidate Word Count' is low, label the summary as "NON-PARTICIPATORY ATTEMPT".

    METADATA: 
    - Candidate Word Count: ${candidateWordCount}
    - Interviewer Turns: ${transcription.filter(l => l.startsWith('Interviewer:')).length}
    - Candidate Turns: ${turnsCount}

    Transcript:
    ${transcriptText}
    `,
    config: {
      thinkingConfig: { thinkingBudget: 8000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Total performance score (0-100). Use strict penalties." },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          coachingTips: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['Communication', 'Technical', 'Strategic', 'Visual'] }
              },
              required: ['title', 'content', 'category']
            }
          },
          metrics: {
            type: Type.OBJECT,
            properties: {
              pacing: {
                type: Type.OBJECT,
                properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING }, details: { type: Type.STRING } },
                required: ['score', 'label', 'details']
              },
              fillerWords: {
                type: Type.OBJECT,
                properties: { 
                  score: { type: Type.NUMBER }, 
                  countDescription: { type: Type.STRING }, 
                  details: { type: Type.STRING },
                  breakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        count: { type: Type.NUMBER }
                      },
                      required: ['word', 'count']
                    }
                  }
                },
                required: ['score', 'countDescription', 'details', 'breakdown']
              },
              conciseness: {
                type: Type.OBJECT,
                properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING }, details: { type: Type.STRING } },
                required: ['score', 'label', 'details']
              },
              clarity: {
                type: Type.OBJECT,
                properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING }, details: { type: Type.STRING } },
                required: ['score', 'label', 'details']
              },
              visual: {
                type: Type.OBJECT,
                properties: {
                  eyeContact: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['score', 'label'] },
                  posture: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['score', 'label'] },
                  gestures: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } }, required: ['score', 'label'] }
                },
                required: ['eyeContact', 'posture', 'gestures']
              }
            },
            required: ['pacing', 'fillerWords', 'conciseness', 'clarity', 'visual']
          }
        },
        required: ['score', 'summary', 'strengths', 'improvements', 'coachingTips', 'metrics']
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateInterviewScenario = async (role: string, company: string, type: string, difficulty: string, persona: InterviewerPersona) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a mock interview scenario for a ${role} at ${company}. 
    Interviewer: ${persona}.
    
    MANDATORY REQUIREMENT: One of the interview questions (in the 'questions' array) MUST always be "Describe yourself in one word." 
    This is usually the final question in the sequence.

    Include:
    1. 3 prep tips for this specific role.
    2. 3 strong, high-impact questions for the candidate to ask at the end.
    3. 3 "Red Flag" questions that the candidate should AVOID asking (e.g., focus on benefits too early, revealing lack of preparation), along with a specific reason for why each is harmful.
    4. Role-specific strategy: What technical skills should they emphasize?
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          interviewerName: { type: Type.STRING },
          interviewerTitle: { type: Type.STRING },
          companyDescription: { type: Type.STRING },
          questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of interview questions. Must include 'Describe yourself in one word.'" },
          preInterviewTips: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] }
          },
          candidateQuestionsToAsk: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { q: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ['q', 'reason'] }
          },
          candidateQuestionsToAvoid: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { q: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ['q', 'reason'] }
          }
        },
        required: ['interviewerName', 'interviewerTitle', 'companyDescription', 'questions', 'preInterviewTips', 'candidateQuestionsToAsk', 'candidateQuestionsToAvoid']
      }
    }
  });
  return JSON.parse(response.text);
};
