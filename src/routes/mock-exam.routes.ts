import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middlewares/auth.js';
import { mockExamRepository } from '../repositories/mock-exam.repository.js';
import { collections } from '../db/index.js';

export const mockExamRoutes = Router();

// ==========================================
// 1. Learner Routes (Requires Authentication)
// ==========================================

// List all published mock exams
mockExamRoutes.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const exams = await mockExamRepository.listPublishedMockExams();
    res.json({ success: true, exams });
  } catch (error: any) {
    console.error('List mock exams error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve mock exams' });
  }
});

// Get specific mock exam details
mockExamRoutes.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await mockExamRepository.getMockExamDetail(req.params.id);
    if (!exam) {
      res.status(404).json({ success: false, error: 'Mock exam not found' });
      return;
    }
    res.json({ success: true, exam });
  } catch (error: any) {
    console.error('Get mock exam detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve mock exam' });
  }
});

// Start a new mock exam attempt
mockExamRoutes.post('/:id/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const attemptId = await mockExamRepository.startAttempt(userId, req.params.id);
    res.status(201).json({ success: true, attemptId });
  } catch (error: any) {
    console.error('Start mock attempt error:', error);
    res.status(500).json({ success: false, error: 'Failed to start mock exam attempt' });
  }
});

// Submit a section during the mock exam
mockExamRoutes.post(
  '/attempts/:attemptId/section',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { section, timeSpentSeconds, payload } = req.body;

      if (!section) {
        res.status(400).json({ success: false, error: 'Section is required' });
        return;
      }

      const result = await mockExamRepository.submitSection({
        userId,
        attemptId: req.params.attemptId,
        section,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        payload: payload || {},
      });

      if (!result) {
        res.status(404).json({ success: false, error: 'Mock attempt not found' });
        return;
      }

      res.json({ success: true, attempt: result });
    } catch (error: any) {
      console.error('Submit section error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to submit section' });
    }
  }
);

// Get final exam scorecard
mockExamRoutes.get(
  '/attempts/:attemptId/scorecard',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const scorecard = await mockExamRepository.getAttemptScorecard(req.params.attemptId, userId);
      if (!scorecard) {
        res.status(404).json({ success: false, error: 'Scorecard not found' });
        return;
      }
      res.json({ success: true, scorecard });
    } catch (error: any) {
      console.error('Get scorecard error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve scorecard' });
    }
  }
);

// ==========================================
// 2. Admin Create Mock Exam Bundle
// ==========================================
mockExamRoutes.post('/admin/create', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      descriptionBn,
      descriptionEn,
      readingPassageId,
      listeningItemId,
      writingTask1PromptId,
      writingTask2PromptId,
      speakingCueId,
      difficulty,
    } = req.body;

    if (!title || !readingPassageId || !listeningItemId) {
      res.status(400).json({ success: false, error: 'Title, readingPassageId, and listeningItemId are required' });
      return;
    }

    const doc = {
      _id: new ObjectId(),
      title,
      descriptionBn: descriptionBn || 'সম্পূর্ণ ৪-দক্ষতা সম্পন্ন আইইএলটিএস মক পরীক্ষা।',
      descriptionEn: descriptionEn || 'Complete 4-skill full IELTS mock exam with official timing.',
      readingPassageId: new ObjectId(readingPassageId),
      listeningItemId: new ObjectId(listeningItemId),
      writingTask1PromptId: new ObjectId(writingTask1PromptId),
      writingTask2PromptId: new ObjectId(writingTask2PromptId),
      speakingCueId: new ObjectId(speakingCueId),
      difficulty: difficulty || 'standard',
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.mockExams().insertOne(doc);
    res.status(201).json({ success: true, examId: doc._id.toString() });
  } catch (error: any) {
    console.error('Create mock exam error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create mock exam' });
  }
});
