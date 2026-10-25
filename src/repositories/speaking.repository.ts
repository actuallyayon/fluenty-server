import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import { profileRepository } from './profile.repository.js';
import { geminiService, SpeakingFeedbackOutput } from '../services/ai/gemini.service.js';
import type { SpeakingCueDoc, SpeakingSessionDoc } from '../types/collections.js';

export const speakingRepository = {
  async getPublishedCueCards(): Promise<
    Array<{
      id: string;
      topic: string;
      topicBn: string;
      cueCard: string;
      cueCardBn: string;
      bulletPoints: string[];
      bulletPointsBn: string[];
      part: 1 | 2 | 3;
      createdAt: Date;
    }>
  > {
    const cues = await collections
      .speakingCues()
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .toArray();

    return cues.map((c) => ({
      id: c._id.toString(),
      topic: c.topic,
      topicBn: c.topicBn,
      cueCard: c.cueCard,
      cueCardBn: c.cueCardBn,
      bulletPoints: c.bulletPoints,
      bulletPointsBn: c.bulletPointsBn,
      part: c.part,
      createdAt: c.createdAt,
    }));
  },

  async getCueCardById(id: string): Promise<SpeakingCueDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    return collections.speakingCues().findOne({ _id: new ObjectId(id), status: 'published' });
  },

  async startSession(
    userId: string,
    cueCardId: string
  ): Promise<{
    sessionId: string;
    topic: string;
    cueCard: string;
    initialQuestion: string;
  } | null> {
    const cue = await this.getCueCardById(cueCardId);
    if (!cue) return null;

    const initialQuestion = `Good day! Welcome to your IELTS Speaking test. My name is Dr. Sarah Jenkins and I will be your examiner today. To begin with, could you please tell me your full name, and whether you are currently studying or working?`;

    const sessionDoc: SpeakingSessionDoc = {
      _id: new ObjectId(),
      userId,
      cueCardPrompt: cue.topic,
      transcript: [
        {
          role: 'examiner',
          part: 1,
          content: initialQuestion,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.speakingSessions().insertOne(sessionDoc);

    return {
      sessionId: sessionDoc._id.toString(),
      topic: cue.topic,
      cueCard: cue.cueCard,
      initialQuestion,
    };
  },

  async sendCandidateMessage(
    userId: string,
    sessionId: string,
    candidateAnswer: string,
    currentPart: 1 | 2 | 3 = 1
  ): Promise<{
    examinerReply: string;
    transcript: Array<{ role: 'examiner' | 'user'; part: 1 | 2 | 3; content: string }>;
  } | null> {
    if (!ObjectId.isValid(sessionId)) return null;
    const sId = new ObjectId(sessionId);

    const session = await collections.speakingSessions().findOne({ _id: sId, userId });
    if (!session) return null;

    // Append candidate message
    const updatedTranscript = [
      ...session.transcript,
      {
        role: 'user' as const,
        part: currentPart,
        content: candidateAnswer.trim(),
        timestamp: new Date(),
      },
    ];

    // Get Gemini examiner question
    const history = updatedTranscript.map((t) => ({ role: t.role, content: t.content }));
    const examinerResponse = await geminiService.generateSpeakingExaminerResponse({
      part: currentPart,
      topic: session.cueCardPrompt,
      conversationHistory: history,
    });

    // Append examiner reply
    updatedTranscript.push({
      role: 'examiner' as const,
      part: currentPart,
      content: examinerResponse.examinerQuestion,
      timestamp: new Date(),
    });

    await collections.speakingSessions().updateOne(
      { _id: sId },
      {
        $set: {
          transcript: updatedTranscript,
          updatedAt: new Date(),
        },
      }
    );

    return {
      examinerReply: examinerResponse.examinerQuestion,
      transcript: updatedTranscript,
    };
  },

  async finishAndEvaluateSession(
    userId: string,
    sessionId: string
  ): Promise<{
    sessionId: string;
    estimatedBand: number;
    feedback: SpeakingFeedbackOutput;
    xpEarned: number;
    newTotalXp: number;
    newStreak: number;
  } | null> {
    if (!ObjectId.isValid(sessionId)) return null;
    const sId = new ObjectId(sessionId);

    const session = await collections.speakingSessions().findOne({ _id: sId, userId });
    if (!session || session.transcript.length === 0) return null;

    // Evaluate with Gemini
    const feedback = await geminiService.evaluateSpeakingSession({
      userId,
      topic: session.cueCardPrompt,
      fullTranscript: session.transcript,
    });

    await collections.speakingSessions().updateOne(
      { _id: sId },
      {
        $set: {
          feedback: {
            estimatedBand: feedback.estimatedBand,
            fluencyCommentsBn: feedback.fluencyCommentsBn,
            vocabCommentsBn: feedback.vocabCommentsBn,
            grammarCommentsBn: feedback.grammarCommentsBn,
            improvementTipsBn: feedback.improvementTipsBn,
          },
          updatedAt: new Date(),
        },
      }
    );

    // Gamification: Award 50 XP
    const xpEarned = 50;
    const updatedProfile = await profileRepository.addXpAndStreak(userId, xpEarned);

    // Structured feedback for frontend display
    const structuredFeedback = {
      ...feedback,
      fluencyCoherence: {
        band: feedback.estimatedBand,
        commentsBn: feedback.fluencyCommentsBn,
        commentsEn: '',
      },
      lexicalResource: {
        band: feedback.estimatedBand,
        commentsBn: feedback.vocabCommentsBn,
        commentsEn: '',
      },
      grammaticalAccuracy: {
        band: feedback.estimatedBand,
        commentsBn: feedback.grammarCommentsBn,
        commentsEn: '',
      },
      pronunciationGuidance: {
        commentsBn:
          'টেক্সট ট্রান্সক্রিপ্ট থেকে সরাসরি উচ্চারণ মূল্যায়ন সম্ভব নয়। তবে বাস্তব পরীক্ষার জন্য স্পষ্ট শব্দোচ্চারণ ও স্বাভাবিক বক্তব্যের গতি বজায় রাখার পরামর্শ দেওয়া হচ্ছে।',
        commentsEn: '',
      },
      actionableBanglaTips:
        typeof feedback.improvementTipsBn === 'string'
          ? feedback.improvementTipsBn
              .split(/\n+/)
              .map((s) => s.replace(/^[-*•\d.]+\s*/, '').trim())
              .filter(Boolean)
          : Array.isArray(feedback.improvementTipsBn)
          ? feedback.improvementTipsBn
          : [],
    };

    return {
      sessionId: session._id.toString(),
      estimatedBand: feedback.estimatedBand,
      feedback: structuredFeedback as any,
      xpEarned,
      newTotalXp: updatedProfile?.xp || 0,
      newStreak: updatedProfile?.dailyStreak || 1,
    };
  },

  async getUserSessions(userId: string, limit: number = 10): Promise<
    Array<{
      id: string;
      topic: string;
      estimatedBand?: number;
      turnCount: number;
      createdAt: Date;
    }>
  > {
    const sessions = await collections
      .speakingSessions()
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return sessions.map((s) => ({
      id: s._id.toString(),
      topic: s.cueCardPrompt,
      estimatedBand: s.feedback?.estimatedBand,
      turnCount: s.transcript.length,
      createdAt: s.createdAt,
    }));
  },

  async getSessionDetail(userId: string, sessionId: string): Promise<any | null> {
    if (!ObjectId.isValid(sessionId)) return null;
    return collections.speakingSessions().findOne({ _id: new ObjectId(sessionId), userId });
  },
};
