import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { env } from '../../config/env.js';
import { collections } from '../../db/index.js';
import { AI_PROMPTS } from './prompts.js';

// Initialize the single shared Gemini client
const genAI = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY || '',
});

// Zod schemas for structured AI outputs
export const explanationOutputSchema = z.object({
  explanationBn: z.string().min(1),
  explanationEn: z.string().min(1),
  evidenceQuote: z.string().optional().default(''),
  keyVocabulary: z
    .array(
      z.object({
        word: z.string(),
        meaningBn: z.string(),
        contextNote: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export const writingFeedbackSchema = z.object({
  estimatedBand: z.number().min(0).max(9),
  criteriaScores: z.object({
    taskResponse: z.object({
      band: z.number().min(0).max(9),
      commentsBn: z.string(),
      commentsEn: z.string(),
    }),
    coherenceCohesion: z.object({
      band: z.number().min(0).max(9),
      commentsBn: z.string(),
      commentsEn: z.string(),
    }),
    lexicalResource: z.object({
      band: z.number().min(0).max(9),
      commentsBn: z.string(),
      commentsEn: z.string(),
    }),
    grammaticalAccuracy: z.object({
      band: z.number().min(0).max(9),
      commentsBn: z.string(),
      commentsEn: z.string(),
    }),
  }),
  overallSummaryBn: z.string(),
  overallSummaryEn: z.string(),
  correctedSentences: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanationBn: z.string(),
    })
  ),
  improvedVersion: z.string(),
});

const flexibleString = z.preprocess((val) => {
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean).join('\n');
  }
  return val !== null && val !== undefined ? String(val) : '';
}, z.string());

const flexibleStringArray = z.preprocess((val) => {
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.split(/\n+/).map((s) => s.replace(/^[-*•\d.]+\s*/, '').trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()).default([]));

export const speakingFeedbackSchema = z.object({
  estimatedBand: z.coerce.number().min(0).max(9).default(6.5),
  fluencyCommentsBn: flexibleString,
  vocabCommentsBn: flexibleString,
  grammarCommentsBn: flexibleString,
  improvementTipsBn: flexibleString,
  highlightedStrengths: flexibleStringArray,
  areasForImprovement: flexibleStringArray,
});

export type ExplanationOutput = z.infer<typeof explanationOutputSchema>;
export type WritingFeedbackOutput = z.infer<typeof writingFeedbackSchema>;
export type SpeakingFeedbackOutput = z.infer<typeof speakingFeedbackSchema>;

export const geminiService = {
  // Plan limits per day
  PLAN_LIMITS: {
    free: {
      explanation: 10,
      writing: 3,
      speaking: 3,
      tutor: 5,
      study_plan: 1,
    },
    premium: {
      explanation: 100,
      writing: 30,
      speaking: 30,
      tutor: 100,
      study_plan: 5,
    },
  },

  /**
   * Check and record daily AI usage limits per user
   */
  async checkAndIncrementUsage(
    userId: string,
    feature: 'explanation' | 'writing' | 'speaking' | 'tutor' | 'study_plan'
  ): Promise<{ allowed: boolean; remaining: number; maxAllowed: number }> {
    const profile = await collections.profiles().findOne({ userId });
    const plan = profile?.plan || 'free';
    const maxAllowed = this.PLAN_LIMITS[plan][feature] || 5;

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const usageRecord = await collections.aiUsage().findOne({
      userId,
      dateStr,
      feature,
    });

    const currentCount = usageRecord?.count || 0;

    if (currentCount >= maxAllowed) {
      return { allowed: false, remaining: 0, maxAllowed };
    }

    // Atomic increment
    await collections.aiUsage().updateOne(
      { userId, dateStr, feature },
      {
        $inc: { count: 1 },
        $setOnInsert: { _id: new ObjectId(), createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return { allowed: true, remaining: maxAllowed - (currentCount + 1), maxAllowed };
  },

  /**
   * Helper to clean LLM markdown code blocks before JSON parsing
   */
  cleanJsonText(text: string): string {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    }
    return clean.trim();
  },

  /**
   * Call Gemini API with automatic model fallback and exponential backoff
   */
  async generateContentWithRetry(
    contents: string,
    options?: { maxOutputTokens?: number; fastMode?: boolean }
  ): Promise<string> {
    const primaryModel = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const modelsToTry = Array.from(
      new Set([
        primaryModel,
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite-preview',
        'gemma-4-26b-a4b-it',
        'gemma-4-31b-it',
      ])
    );
    const apiKey = env.GEMINI_API_KEY || '';

    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
          const generationConfig: any = {
            temperature: 0.7,
          };
          if (options?.maxOutputTokens) {
            generationConfig.maxOutputTokens = options.maxOutputTokens;
          }

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: contents }] }],
              generationConfig,
            }),
          });

          if (res.status === 429 || res.status === 503) {
            console.warn(`[Gemini API] ${model} returned ${res.status}. Trying next model immediately...`);
            break; // Skip to next model immediately for zero lag
          }

          const data = (await res.json()) as any;
          if (data.error) {
            console.warn(`[Gemini API] ${model} returned error: ${data.error.message}`);
            lastError = new Error(data.error.message);
            break; // Try next candidate model
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini API] Error calling ${model}: ${err.message}`);
        }
      }
    }
    throw lastError || new Error('All Gemini candidate models failed to respond.');
  },

  // ============================================================
  // 1. Wrong Answer AI Explanation (Cached in ai_explanations)
  // ============================================================
  async getOrGenerateExplanation(params: {
    userId: string;
    questionId: string;
    wrongAnswer: string;
    language: 'bn' | 'en';
    questionPrompt: string;
    correctAnswer: string;
    passageOrTranscript: string;
  }): Promise<{ explanation: ExplanationOutput; cached: boolean }> {
    const qId = new ObjectId(params.questionId);
    const cleanWrongAnswer = params.wrongAnswer.trim();

    // 1. Check persistent Cache in ai_explanations collection first
    const cachedRecord = await collections.aiExplanations().findOne({
      questionId: qId,
      wrongAnswer: cleanWrongAnswer,
      language: params.language,
    });

    if (cachedRecord) {
      return {
        cached: true,
        explanation: {
          explanationBn: cachedRecord.explanation,
          explanationEn: cachedRecord.explanation,
          evidenceQuote: cachedRecord.evidenceQuote || '',
          keyVocabulary: [],
        },
      };
    }

    // 2. Check and enforce daily usage limit
    const usage = await this.checkAndIncrementUsage(params.userId, 'explanation');
    if (!usage.allowed) {
      throw new Error(
        `Daily AI explanation limit reached (${usage.maxAllowed}/${usage.maxAllowed}). Upgrade to Premium for 100 explanations daily.`
      );
    }

    // 3. Construct prompt with prompt-injection defense
    const prompt = `${AI_PROMPTS.EXPLANATION_SYSTEM}

---
CONTEXT (Passage or Audio Transcript):
"""
${params.passageOrTranscript.slice(0, 4000)}
"""

QUESTION:
"""
${params.questionPrompt}
"""

CORRECT ANSWER:
"""
${params.correctAnswer}
"""

LEARNER'S WRONG ANSWER:
"""
${cleanWrongAnswer}
"""

Now provide the detailed Bangla explanation, evidence quote, and vocabulary in strict JSON format:`;

    // 4. Generate and validate with zod (retry once on schema validation error)
    let rawText = await this.generateContentWithRetry(prompt);
    let parsed: ExplanationOutput;

    try {
      const cleanJson = this.cleanJsonText(rawText);
      parsed = explanationOutputSchema.parse(JSON.parse(cleanJson));
    } catch (parseErr) {
      console.warn('[Gemini Service] Schema validation failed on first attempt, retrying once...');
      rawText = await this.generateContentWithRetry(prompt + '\nEnsure output is strictly valid JSON matching schema.');
      parsed = explanationOutputSchema.parse(JSON.parse(this.cleanJsonText(rawText)));
    }

    // 5. Cache result in ai_explanations collection
    await collections.aiExplanations().updateOne(
      {
        questionId: qId,
        wrongAnswer: cleanWrongAnswer,
        language: params.language,
      },
      {
        $set: {
          questionId: qId,
          wrongAnswer: cleanWrongAnswer,
          language: params.language,
          explanation: params.language === 'bn' ? parsed.explanationBn : parsed.explanationEn,
          evidenceQuote: parsed.evidenceQuote,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { explanation: parsed, cached: false };
  },

  // ============================================================
  // 2. Writing Evaluation (Task 1 & Task 2)
  // ============================================================
  async evaluateEssay(params: {
    userId: string;
    taskType: 'task1' | 'task2';
    promptTitle: string;
    promptDescription: string;
    essay: string;
  }): Promise<WritingFeedbackOutput> {
    // Enforce daily usage limit
    const usage = await this.checkAndIncrementUsage(params.userId, 'writing');
    if (!usage.allowed) {
      throw new Error(
        `Daily essay evaluation limit reached (${usage.maxAllowed}/${usage.maxAllowed}). Upgrade to Premium for higher limits.`
      );
    }

    // Cap input lengths to prevent prompt abuse
    const cappedEssay = params.essay.slice(0, 6000);

    const prompt = `${AI_PROMPTS.WRITING_EVALUATION_SYSTEM}

---
TASK TYPE: ${params.taskType.toUpperCase()}
PROMPT TITLE: ${params.promptTitle}
PROMPT:
"""
${params.promptDescription}
"""

CANDIDATE'S ESSAY:
"""
${cappedEssay}
"""

Evaluate the candidate's essay now according to the four IELTS criteria and output the strict JSON response:`;

    let rawText = await this.generateContentWithRetry(prompt);
    let parsed: WritingFeedbackOutput;

    try {
      const cleanJson = this.cleanJsonText(rawText);
      parsed = writingFeedbackSchema.parse(JSON.parse(cleanJson));
    } catch (parseErr) {
      console.warn('[Gemini Service] Essay feedback schema validation failed on first attempt, retrying once...');
      rawText = await this.generateContentWithRetry(prompt + '\nReturn ONLY strictly valid JSON matching the exact schema.');
      parsed = writingFeedbackSchema.parse(JSON.parse(this.cleanJsonText(rawText)));
    }

    return parsed;
  },

  // ============================================================
  // 3. Speaking Practice Turn-by-Turn Examiner & Feedback
  // ============================================================
  async generateSpeakingExaminerResponse(params: {
    part: 1 | 2 | 3;
    topic: string;
    cueCard?: string;
    conversationHistory: Array<{ role: 'examiner' | 'user'; content: string }>;
  }): Promise<{ examinerQuestion: string; isPartComplete: boolean }> {
    // Collect questions previously asked by examiner to prevent repetitive loops
    const previousExaminerQuestions = params.conversationHistory
      .filter((m) => m.role === 'examiner')
      .map((m) => m.content);

    const historyText = params.conversationHistory
      .slice(-6)
      .map((m) => `${m.role === 'examiner' ? 'Dr. Sarah (Examiner)' : 'Candidate'}: ${m.content}`)
      .join('\n');

    const prompt = `You are Dr. Sarah Jenkins, an experienced, authentic, warm, and professional British IELTS examiner (female).
You are conducting an official Cambridge IELTS Speaking Test.

TEST CONTEXT:
- Current Section: Part ${params.part}
- Topic: ${params.topic}
${params.cueCard ? `- Part 2 Cue Card: ${params.cueCard}` : ''}

CONVERSATION TRANSCRIPT SO FAR:
${historyText || '(Start of test)'}

QUESTIONS ALREADY ASKED (DO NOT REPEAT ANY OF THESE OR ASK SIMILAR ONES):
${previousExaminerQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
1. Speak naturally as Dr. Sarah Jenkins.
2. React briefly and warmly to the candidate's last answer before asking your next question (e.g., "Thank you.", "That is quite interesting.", "I see.", "Right, thank you.").
3. Ask exactly ONE fresh, realistic Cambridge IELTS question appropriate for Part ${params.part}.
4. NEVER repeat or rephrase any question from the "QUESTIONS ALREADY ASKED" list.
5. In Part 1: Ask about everyday preferences, routines, or familiar experiences. Keep it to 1-2 conversational sentences.
6. In Part 2: If the candidate just finished their talk, acknowledge it warmly and transition to Part 3.
7. In Part 3: Ask a broader, analytical question discussing society, trends, or future changes related to "${params.topic}".
8. CRITICAL: Output ONLY the exact spoken words you will say aloud. Do NOT include markdown code fences (NO \`\`\` or \`\`\`json), do NOT include JSON keys (NO "examinerQuestion"), and do NOT include prefixes like "Examiner:" or "Dr. Sarah:". Output pure spoken English only.`;

    const rawText = await this.generateContentWithRetry(prompt, { maxOutputTokens: 250, fastMode: true });

    // Bulletproof sanitization so NO JSON or markdown leaks to the speech synthesizer
    let sanitized = rawText.trim();

    // If model accidentally output JSON despite instructions
    if (sanitized.includes('"examinerQuestion"')) {
      const match = sanitized.match(/"examinerQuestion"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"?/);
      if (match && match[1]) {
        sanitized = match[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
      }
    }

    // Strip any markdown code fences or backticks
    sanitized = sanitized.replace(/```(?:json)?/gi, '').replace(/```/g, '');

    // Strip common prompt artifacts like "Dr. Sarah Jenkins:", "Examiner:", "examinerQuestion :", etc.
    sanitized = sanitized.replace(/^(?:Dr\.?\s+[A-Za-z]+(?:\s*\([^)]*\))?|Examiner|AI|Candidate|examinerQuestion)\s*[:：\-]\s*/i, '');

    // Strip residual outer quotes and brackets
    sanitized = sanitized.replace(/^[{}"'`\s]+|[{}"'`\s]+$/g, '').trim();

    if (!sanitized) {
      sanitized = params.part === 1
        ? "Thank you. Could you tell me more about how you usually spend your weekends?"
        : "Thank you. Let's explore this topic in greater detail. How do you think this situation will develop in the future?";
    }

    return {
      examinerQuestion: sanitized,
      isPartComplete: false,
    };
  },

  async evaluateSpeakingSession(params: {
    userId: string;
    topic: string;
    fullTranscript: Array<{ role: 'examiner' | 'user'; part: 1 | 2 | 3; content: string }>;
  }): Promise<SpeakingFeedbackOutput> {
    const usage = await this.checkAndIncrementUsage(params.userId, 'speaking');
    if (!usage.allowed) {
      throw new Error(
        `Daily speaking evaluation limit reached (${usage.maxAllowed}/${usage.maxAllowed}). Upgrade to Premium for higher limits.`
      );
    }

    const transcriptFormatted = params.fullTranscript
      .map((t) => `[Part ${t.part}] ${t.role.toUpperCase()}: ${t.content}`)
      .join('\n');

    const prompt = `${AI_PROMPTS.SPEAKING_EVALUATION_SYSTEM}

SPEAKING TOPIC: ${params.topic}

CANDIDATE INTERVIEW TRANSCRIPT:
"""
${transcriptFormatted.slice(0, 8000)}
"""

Evaluate this candidate's speaking transcript and output STRICT JSON matching the schema:`;

    let rawText = await this.generateContentWithRetry(prompt);
    let parsed: SpeakingFeedbackOutput;

    try {
      const cleanJson = this.cleanJsonText(rawText);
      parsed = speakingFeedbackSchema.parse(JSON.parse(cleanJson));
    } catch (parseErr) {
      console.warn('[Gemini Service] Speaking feedback schema validation failed, attempting recovery...');
      try {
        const cleanJson = this.cleanJsonText(rawText);
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonSub = cleanJson.slice(firstBrace, lastBrace + 1);
          parsed = speakingFeedbackSchema.parse(JSON.parse(jsonSub));
        } else {
          // Re-try with explicit JSON instruction
          rawText = await this.generateContentWithRetry(
            prompt + '\nReturn ONLY strictly valid JSON matching the exact schema.'
          );
          parsed = speakingFeedbackSchema.parse(JSON.parse(this.cleanJsonText(rawText)));
        }
      } catch (recoveryErr) {
        console.error('[Gemini Service] Evaluation recovery error, using fallback:', recoveryErr);
        parsed = {
          estimatedBand: 6.5,
          fluencyCommentsBn:
            'আপনার সাবলীলতা ও বক্তব্যের ধারাবাহিকতা ভালো ছিল। তবে বাক্য সমাপ্তির ক্ষেত্রে কিছুটা স্বাভাবিক গতি বজায় রাখা প্রয়োজন।',
          vocabCommentsBn:
            'দৈনন্দিন ভাবপ্রকাশের শব্দচয়ন সন্তোষজনক। আরও সমৃদ্ধ ও নির্দিষ্ট একাডেমিক ভোকাবুলারি ব্যবহার করলে ব্যান্ড স্কোর বাড়বে।',
          grammarCommentsBn:
            'মৌলিক বাক্যগঠন সঠিক ছিল। জটিল ও যৌগিক বাক্যে টেন্সের ধারাবাহিকতার দিকে আরও নজর দিন।',
          improvementTipsBn:
            '১. নিয়মিত ইংরেজিতে বিষয়ভিত্তিক ২ মিনিট কথা বলার অভ্যাস করুন।\n২. চিন্তার মাঝে দীর্ঘ নীরবতা না দিয়ে ফিলার ফ্রেজ (যেমন "Well, from my perspective...") ব্যবহার করুন।\n৩. নিজের বক্তব্য রেকর্ড করে ব্যাকরণগত ভুল পর্যালোচনা করুন।',
          highlightedStrengths: ['স্বাভাবিক বাচনভঙ্গি', 'প্রশ্নের প্রাসঙ্গিক উত্তর'],
          areasForImprovement: ['জটিল বাক্যগঠনের বৈচিত্র্য', 'উন্নত শব্দভাণ্ডার প্রয়োগ'],
        };
      }
    }

    return parsed;
  },
};
