import { Router, Response } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { collections } from '../db/index.js';
import { vocabLearningRepository } from '../repositories/vocab-learning.repository.js';
import { bookmarkRepository } from '../repositories/bookmark.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';

export const learningRoutes = Router();

// Protect all learning endpoints with authentication
learningRoutes.use(requireAuth);

// ==========================================
// 1. Vocabulary Learning Endpoints
// ==========================================

// GET /api/learning/vocab/cards - Get flashcard review deck
learningRoutes.get('/vocab/cards', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await vocabLearningRepository.getFlashcardDeck(userId, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in GET /api/learning/vocab/cards:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve flashcards' });
  }
});

const reviewVocabSchema = z.object({
  vocabItemId: z.string().min(1, 'vocabItemId is required'),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

// POST /api/learning/vocab/review - Submit SM-2 review rating
learningRoutes.post('/vocab/review', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = reviewVocabSchema.parse(req.body);

    const result = await vocabLearningRepository.recordReview(
      userId,
      parsed.vocabItemId,
      parsed.rating
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/learning/vocab/review:', error);
    res.status(500).json({ success: false, error: 'Failed to record vocabulary review' });
  }
});

// GET /api/learning/vocab/stats - User's vocabulary mastery statistics
learningRoutes.get('/vocab/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await vocabLearningRepository.getVocabStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in GET /api/learning/vocab/stats:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve vocab stats' });
  }
});

// ==========================================
// 2. Grammar Lessons Endpoints
// ==========================================

// GET /api/learning/grammar/lessons - List published grammar lessons
learningRoutes.get('/grammar/lessons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subCategory } = req.query as { subCategory?: string };

    const query: any = { status: 'published' };
    if (subCategory && subCategory !== 'all') {
      query.subCategory = subCategory;
    }

    const lessons = await collections.lessons().find(query).sort({ order: 1, createdAt: 1 }).toArray();

    // Check bookmarks for user
    const bookmarks = await collections.bookmarks().find({ userId, itemType: 'lesson' }).toArray();
    const bookmarkedIds = new Set(bookmarks.map((b) => b.itemId.toString()));

    res.json({
      success: true,
      lessons: lessons.map((l) => ({
        id: l._id.toString(),
        title: l.title,
        titleBn: l.titleBn,
        category: l.category,
        subCategory: l.subCategory,
        contentBn: l.contentBn,
        contentEn: l.contentEn,
        commonMistakesCount: l.commonMistakesBn?.length || 0,
        order: l.order,
        isBookmarked: bookmarkedIds.has(l._id.toString()),
      })),
    });
  } catch (error) {
    console.error('Error in GET /api/learning/grammar/lessons:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve grammar lessons' });
  }
});

// GET /api/learning/grammar/lessons/:id - Get single lesson
learningRoutes.get('/grammar/lessons/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid lesson ID' });
      return;
    }

    const lesson = await collections.lessons().findOne({ _id: new ObjectId(id) });
    if (!lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found' });
      return;
    }

    const bookmark = await collections.bookmarks().findOne({
      userId,
      itemType: 'lesson',
      itemId: new ObjectId(id),
    });

    res.json({
      success: true,
      lesson: {
        id: lesson._id.toString(),
        title: lesson.title,
        titleBn: lesson.titleBn,
        category: lesson.category,
        subCategory: lesson.subCategory,
        contentBn: lesson.contentBn,
        contentEn: lesson.contentEn,
        commonMistakesBn: lesson.commonMistakesBn || [],
        order: lesson.order,
        isBookmarked: Boolean(bookmark),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/learning/grammar/lessons/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve lesson' });
  }
});

// POST /api/learning/grammar/lessons/:id/complete - Mark lesson completed (+25 XP)
learningRoutes.post('/grammar/lessons/:id/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid lesson ID' });
      return;
    }

    // Award +25 XP and update daily streak
    const updatedProfile = await profileRepository.addXpAndStreak(userId, 25);

    res.json({
      success: true,
      message: 'Lesson completed! +25 XP awarded',
      xpEarned: 25,
      totalXp: updatedProfile?.xp || 0,
      dailyStreak: updatedProfile?.dailyStreak || 1,
    });
  } catch (error) {
    console.error('Error in POST /api/learning/grammar/lessons/:id/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to complete lesson' });
  }
});

// ==========================================
// 3. Bookmarks Endpoints
// ==========================================

// GET /api/learning/bookmarks - List all user bookmarks
learningRoutes.get('/bookmarks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemType } = req.query as { itemType?: 'vocab' | 'question' | 'lesson' };
    const bookmarks = await bookmarkRepository.listUserBookmarks(userId, itemType);
    res.json({ success: true, bookmarks });
  } catch (error) {
    console.error('Error in GET /api/learning/bookmarks:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve bookmarks' });
  }
});

const toggleBookmarkSchema = z.object({
  itemType: z.enum(['vocab', 'question', 'lesson']),
  itemId: z.string().min(1, 'itemId is required'),
});

// POST /api/learning/bookmarks/toggle - Toggle bookmark
learningRoutes.post('/bookmarks/toggle', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = toggleBookmarkSchema.parse(req.body);

    const result = await bookmarkRepository.toggleBookmark(
      userId,
      parsed.itemType,
      parsed.itemId
    );

    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/learning/bookmarks/toggle:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle bookmark' });
  }
});
