import { Router, Response } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { geminiService } from '../services/ai/gemini.service.js';
import { collections } from '../db/index.js';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

const explainRequestSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  wrongAnswer: z.string().min(1, 'wrongAnswer is required'),
  language: z.enum(['bn', 'en']).default('bn'),
});

/**
 * POST /api/ai/explain
 * Generate or retrieve cached Gemini explanation in Bangla for a wrong answer
 */
aiRoutes.post('/explain', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, wrongAnswer, language } = explainRequestSchema.parse(req.body);

    if (!ObjectId.isValid(questionId)) {
      res.status(400).json({ success: false, error: 'Invalid questionId' });
      return;
    }

    const question = await collections.questions().findOne({ _id: new ObjectId(questionId) });
    if (!question) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }

    // Retrieve context passage or listening transcript
    let contextText = '';
    if (question.passageId) {
      const passage = await collections.passages().findOne({ _id: question.passageId });
      if (passage) contextText = passage.content;
    } else if (question.listeningItemId) {
      const item = await collections.listeningItems().findOne({ _id: question.listeningItemId });
      if (item) contextText = item.transcript;
    }

    const result = await geminiService.getOrGenerateExplanation({
      userId,
      questionId,
      wrongAnswer,
      language,
      questionPrompt: question.prompt,
      correctAnswer: question.correctAnswer,
      passageOrTranscript: contextText,
    });

    res.json({
      success: true,
      cached: result.cached,
      explanation: result.explanation,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/ai/explain:', error);
    res.status(error.message?.includes('limit reached') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to generate AI explanation',
    });
  }
});

/**
 * GET /api/ai/usage
 * Check user's daily usage status and plan limits
 */
aiRoutes.get('/usage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await collections.profiles().findOne({ userId });
    const plan = profile?.plan || 'free';
    const dateStr = new Date().toISOString().slice(0, 10);

    const records = await collections.aiUsage().find({ userId, dateStr }).toArray();
    const usageMap: Record<string, number> = {};
    records.forEach((r) => {
      usageMap[r.feature] = r.count;
    });

    const limits = geminiService.PLAN_LIMITS[plan];

    res.json({
      success: true,
      plan,
      dateStr,
      usage: {
        explanation: { used: usageMap['explanation'] || 0, max: limits.explanation },
        writing: { used: usageMap['writing'] || 0, max: limits.writing },
        speaking: { used: usageMap['speaking'] || 0, max: limits.speaking },
        tutor: { used: usageMap['tutor'] || 0, max: limits.tutor },
        study_plan: { used: usageMap['study_plan'] || 0, max: limits.study_plan },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/ai/usage:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve AI usage' });
  }
});
