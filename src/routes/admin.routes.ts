import { Router, Response } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { requireAdmin, AuthenticatedRequest } from '../middlewares/auth.js';
import { contentRepository } from '../repositories/content.repository.js';
import { adminUserRepository } from '../repositories/admin-user.repository.js';
import { collections } from '../db/index.js';
import {
  createVocabSchema,
  updateVocabSchema,
  createLessonSchema,
  updateLessonSchema,
  createPassageSchema,
  updatePassageSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createListeningSchema,
  updateListeningSchema,
  createWritingPromptSchema,
  updateWritingPromptSchema,
  createSpeakingCueSchema,
  updateSpeakingCueSchema,
  banUserSchema,
  updateRoleSchema,
  updatePlanSchema,
} from '../schemas/admin.schemas.js';

export const adminRoutes = Router();

// Apply requireAdmin to ALL admin routes
adminRoutes.use(requireAdmin);

// ==========================================
// 0. Overview Stats
// ==========================================
adminRoutes.get('/overview', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await contentRepository.getOverviewStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to load overview stats' });
  }
});

// ==========================================
// 1. Vocabulary Management Routes
// ==========================================
adminRoutes.get('/vocab', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, difficulty } = req.query as Record<string, string | undefined>;
    const items = await contentRepository.listVocab({ status, search, difficulty });
    res.json({
      success: true,
      items: items.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error) {
    console.error('List vocab error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve vocab items' });
  }
});

adminRoutes.get('/vocab/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await contentRepository.getVocabById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Vocab item not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve vocab item' });
  }
});

adminRoutes.post('/vocab', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createVocabSchema.parse(req.body);
    const item = await contentRepository.createVocab(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create vocab error:', error);
    res.status(500).json({ success: false, error: 'Failed to create vocab item' });
  }
});

adminRoutes.put('/vocab/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateVocabSchema.parse(req.body);
    const item = await contentRepository.updateVocab(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Vocab item not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update vocab error:', error);
    res.status(500).json({ success: false, error: 'Failed to update vocab item' });
  }
});

adminRoutes.delete('/vocab/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteVocab(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Vocab item not found' });
      return;
    }
    res.json({ success: true, message: 'Vocab item deleted successfully' });
  } catch (error) {
    console.error('Delete vocab error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete vocab item' });
  }
});

// ==========================================
// 2. Grammar Lessons Routes
// ==========================================
adminRoutes.get('/lessons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, status, search } = req.query as Record<string, string | undefined>;
    const items = await contentRepository.listLessons({ category, status, search });
    res.json({
      success: true,
      items: items.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error) {
    console.error('List lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve lessons' });
  }
});

adminRoutes.get('/lessons/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await contentRepository.getLessonById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve lesson' });
  }
});

adminRoutes.post('/lessons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createLessonSchema.parse(req.body);
    const item = await contentRepository.createLesson(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

adminRoutes.put('/lessons/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateLessonSchema.parse(req.body);
    const item = await contentRepository.updateLesson(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

adminRoutes.delete('/lessons/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteLesson(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// ==========================================
// 3. Reading Passages & Questions Routes
// ==========================================
adminRoutes.get('/passages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { difficulty, status, search } = req.query as Record<string, string | undefined>;
    const passages = await contentRepository.listPassages({ difficulty, status, search });
    res.json({
      success: true,
      items: passages.map((p) => ({ ...p, id: p._id.toString() })),
    });
  } catch (error) {
    console.error('List passages error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve passages' });
  }
});

adminRoutes.get('/passages/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const passage = await contentRepository.getPassageById(req.params.id);
    if (!passage) {
      res.status(404).json({ success: false, error: 'Passage not found' });
      return;
    }
    const questions = await contentRepository.listQuestions({ passageId: req.params.id });
    res.json({
      success: true,
      item: {
        ...passage,
        id: passage._id.toString(),
        questions: questions.map((q) => ({ ...q, id: q._id.toString() })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve passage' });
  }
});

adminRoutes.post('/passages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createPassageSchema.parse(req.body);
    const item = await contentRepository.createPassage(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create passage error:', error);
    res.status(500).json({ success: false, error: 'Failed to create passage' });
  }
});

adminRoutes.put('/passages/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updatePassageSchema.parse(req.body);
    const item = await contentRepository.updatePassage(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Passage not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update passage error:', error);
    res.status(500).json({ success: false, error: 'Failed to update passage' });
  }
});

adminRoutes.delete('/passages/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deletePassage(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Passage not found' });
      return;
    }
    res.json({ success: true, message: 'Passage and associated questions deleted successfully' });
  } catch (error) {
    console.error('Delete passage error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete passage' });
  }
});

// Questions CRUD
adminRoutes.get('/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { passageId, listeningItemId, status } = req.query as Record<string, string | undefined>;
    const questions = await contentRepository.listQuestions({ passageId, listeningItemId, status });
    res.json({
      success: true,
      items: questions.map((q) => ({
        ...q,
        id: q._id.toString(),
        passageId: q.passageId?.toString(),
        listeningItemId: q.listeningItemId?.toString(),
      })),
    });
  } catch (error) {
    console.error('List questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve questions' });
  }
});

adminRoutes.post('/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createQuestionSchema.parse(req.body);
    const docData: any = {
      ...parsed,
      passageId: parsed.passageId && ObjectId.isValid(parsed.passageId) ? new ObjectId(parsed.passageId) : undefined,
      listeningItemId: parsed.listeningItemId && ObjectId.isValid(parsed.listeningItemId) ? new ObjectId(parsed.listeningItemId) : undefined,
    };
    const item = await contentRepository.createQuestion(docData);
    res.status(201).json({
      success: true,
      item: {
        ...item,
        id: item._id.toString(),
        passageId: item.passageId?.toString(),
        listeningItemId: item.listeningItemId?.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create question error:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

adminRoutes.put('/questions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateQuestionSchema.parse(req.body);
    const updateData: any = { ...parsed };
    if (parsed.passageId) {
      updateData.passageId = ObjectId.isValid(parsed.passageId) ? new ObjectId(parsed.passageId) : undefined;
    }
    if (parsed.listeningItemId) {
      updateData.listeningItemId = ObjectId.isValid(parsed.listeningItemId) ? new ObjectId(parsed.listeningItemId) : undefined;
    }

    const item = await contentRepository.updateQuestion(req.params.id, updateData);
    if (!item) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }
    res.json({
      success: true,
      item: {
        ...item,
        id: item._id.toString(),
        passageId: item.passageId?.toString(),
        listeningItemId: item.listeningItemId?.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update question error:', error);
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
});

adminRoutes.delete('/questions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteQuestion(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

// ==========================================
// 4. Listening Items Routes
// ==========================================
adminRoutes.get('/listening', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { section, status, search } = req.query as Record<string, string | undefined>;
    const items = await contentRepository.listListening({
      section: section ? (parseInt(section, 10) as any) : undefined,
      status,
      search,
    });
    res.json({
      success: true,
      items: items.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error) {
    console.error('List listening error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve listening items' });
  }
});

adminRoutes.post('/listening', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createListeningSchema.parse(req.body);
    const item = await contentRepository.createListening(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create listening error:', error);
    res.status(500).json({ success: false, error: 'Failed to create listening item' });
  }
});

adminRoutes.put('/listening/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateListeningSchema.parse(req.body);
    const item = await contentRepository.updateListening(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Listening item not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update listening error:', error);
    res.status(500).json({ success: false, error: 'Failed to update listening item' });
  }
});

adminRoutes.delete('/listening/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteListening(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Listening item not found' });
      return;
    }
    res.json({ success: true, message: 'Listening item deleted successfully' });
  } catch (error) {
    console.error('Delete listening error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete listening item' });
  }
});

// ==========================================
// 5. Writing Prompts Routes
// ==========================================
adminRoutes.get('/writing-prompts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskType, status, search } = req.query as Record<string, string | undefined>;
    const items = await contentRepository.listWritingPrompts({ taskType, status, search });
    res.json({
      success: true,
      items: items.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error) {
    console.error('List writing prompts error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve writing prompts' });
  }
});

adminRoutes.post('/writing-prompts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createWritingPromptSchema.parse(req.body);
    const item = await contentRepository.createWritingPrompt(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create writing prompt error:', error);
    res.status(500).json({ success: false, error: 'Failed to create writing prompt' });
  }
});

adminRoutes.put('/writing-prompts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateWritingPromptSchema.parse(req.body);
    const item = await contentRepository.updateWritingPrompt(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Writing prompt not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update writing prompt error:', error);
    res.status(500).json({ success: false, error: 'Failed to update writing prompt' });
  }
});

adminRoutes.delete('/writing-prompts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteWritingPrompt(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Writing prompt not found' });
      return;
    }
    res.json({ success: true, message: 'Writing prompt deleted successfully' });
  } catch (error) {
    console.error('Delete writing prompt error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete writing prompt' });
  }
});

// ==========================================
// 6. Speaking Cue Cards Routes
// ==========================================
adminRoutes.get('/speaking-cues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { part, status, search } = req.query as Record<string, string | undefined>;
    const items = await contentRepository.listSpeakingCues({
      part: part ? (parseInt(part, 10) as any) : undefined,
      status,
      search,
    });
    res.json({
      success: true,
      items: items.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error) {
    console.error('List speaking cues error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve speaking cues' });
  }
});

adminRoutes.post('/speaking-cues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createSpeakingCueSchema.parse(req.body);
    const item = await contentRepository.createSpeakingCue(parsed);
    res.status(201).json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Create speaking cue error:', error);
    res.status(500).json({ success: false, error: 'Failed to create speaking cue' });
  }
});

adminRoutes.put('/speaking-cues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateSpeakingCueSchema.parse(req.body);
    const item = await contentRepository.updateSpeakingCue(req.params.id, parsed);
    if (!item) {
      res.status(404).json({ success: false, error: 'Speaking cue not found' });
      return;
    }
    res.json({ success: true, item: { ...item, id: item._id.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update speaking cue error:', error);
    res.status(500).json({ success: false, error: 'Failed to update speaking cue' });
  }
});

adminRoutes.delete('/speaking-cues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await contentRepository.deleteSpeakingCue(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Speaking cue not found' });
      return;
    }
    res.json({ success: true, message: 'Speaking cue deleted successfully' });
  } catch (error) {
    console.error('Delete speaking cue error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete speaking cue' });
  }
});

// ==========================================
// 7. User Management Routes
// ==========================================
adminRoutes.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, plan, status, page, limit } = req.query as Record<
      string,
      string | undefined
    >;
    const result = await adminUserRepository.listUsers({
      search,
      role,
      plan,
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve users' });
  }
});

adminRoutes.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userDetail = await adminUserRepository.getUserDetail(req.params.id);
    if (!userDetail) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, ...userDetail });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve user details' });
  }
});

adminRoutes.patch('/users/:id/ban', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = banUserSchema.parse(req.body);
    const updated = await adminUserRepository.setBanStatus(
      req.params.id,
      parsed.banned,
      parsed.banReason
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      message: parsed.banned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: updated._id.toString(),
        userId: updated.userId,
        banned: updated.banned,
        banReason: updated.banReason,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update ban status' });
  }
});

adminRoutes.patch('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateRoleSchema.parse(req.body);
    const updated = await adminUserRepository.setRole(req.params.id, parsed.role);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      message: `User role updated to ${parsed.role}`,
      user: {
        id: updated._id.toString(),
        userId: updated.userId,
        role: updated.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

adminRoutes.patch('/users/:id/plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updatePlanSchema.parse(req.body);
    const updated = await adminUserRepository.setPlan(req.params.id, parsed.plan);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      message: `User plan updated to ${parsed.plan}`,
      user: {
        id: updated._id.toString(),
        userId: updated.userId,
        plan: updated.plan,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Update plan error:', error);
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

// ==========================================
// 8. Analytics & Monetization Endpoint
// ==========================================
adminRoutes.get('/analytics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      freeUsers,
      totalAttempts,
      totalWriting,
      totalSpeaking,
      totalMockExams,
      totalExplanations,
      paymentsList,
    ] = await Promise.all([
      collections.profiles().countDocuments(),
      collections.profiles().countDocuments({ plan: 'premium' }),
      collections.profiles().countDocuments({ plan: 'free' }),
      collections.attempts().countDocuments(),
      collections.writingSubmissions().countDocuments(),
      collections.speakingSessions().countDocuments(),
      collections.mockExamAttempts().countDocuments(),
      collections.aiExplanations().countDocuments(),
      collections.payments().find().sort({ createdAt: -1 }).toArray(),
    ]);

    // Calculate revenue by currency
    let totalRevenueBdt = 0;
    let totalRevenueUsd = 0;
    const paymentMethods: Record<string, number> = { bkash: 0, nagad: 0, rocket: 0, stripe: 0 };

    for (const p of paymentsList) {
      if (p.status === 'completed') {
        if (p.currency === 'BDT') {
          totalRevenueBdt += p.amount;
        } else {
          totalRevenueUsd += p.amount;
        }

        const method = p.paymentMethod || 'stripe';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      }
    }

    // Recent 10 transactions
    const recentPayments = paymentsList.slice(0, 10).map((p) => ({
      id: p._id.toString(),
      userId: p.userId,
      method: p.paymentMethod || 'stripe',
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      trxId: p.trxId || p.stripeSessionId || 'N/A',
      createdAt: p.createdAt,
    }));

    res.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0',
        },
        activity: {
          readingListeningAttempts: totalAttempts,
          writingEssays: totalWriting,
          speakingSessions: totalSpeaking,
          mockExamsCompleted: totalMockExams,
          totalPracticeEvents: totalAttempts + totalWriting + totalSpeaking + totalMockExams,
        },
        aiUsage: {
          cachedExplanations: totalExplanations,
          estimatedAiCostSavedBdt: (totalExplanations * 2.5).toFixed(0),
        },
        revenue: {
          totalBdt: totalRevenueBdt,
          totalUsd: totalRevenueUsd,
          transactionsCount: paymentsList.filter((p) => p.status === 'completed').length,
          paymentMethods,
          recentPayments,
        },
      },
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate platform analytics' });
  }
});

