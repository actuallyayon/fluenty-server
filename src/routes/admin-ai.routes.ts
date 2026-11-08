import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAdmin, AuthenticatedRequest } from '../middlewares/auth.js';
import {
  adminGeneratorService,
  generatedReadingSchema,
  generatedListeningSchema,
  generatedWritingSchema,
  generatedSpeakingSchema,
} from '../services/ai/admin-generator.service.js';
import { newsPortalService } from '../services/news/news-portal.service.js';

export const adminAiRoutes = Router();

// Protect all admin AI routes with requireAdmin
adminAiRoutes.use(requireAdmin);

// ==========================================
// News Portals & British Council Integration
// ==========================================

// GET /api/admin/ai/news-portals - List all connected news portals & educational feeds
adminAiRoutes.get('/news-portals', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const portals = newsPortalService.getPortals();
    res.json({ success: true, portals });
  } catch (error: any) {
    console.error('Fetch news portals error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list news portals' });
  }
});

// GET /api/admin/ai/news-portals/:portalId/articles - Fetch articles & news lines from selected portal
adminAiRoutes.get('/news-portals/:portalId/articles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { portalId } = req.params;
    if (portalId === 'all') {
      const allData = await newsPortalService.fetchAllPortalsArticles();
      res.json({ success: true, ...allData, isLive: true });
      return;
    }

    const data = await newsPortalService.fetchArticlesFromPortal(portalId);
    res.json({ success: true, ...data });
  } catch (error: any) {
    console.error(`Fetch articles error for ${req.params.portalId}:`, error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch portal articles' });
  }
});

// POST /api/admin/ai/generate-from-news - Transform specific selected news article into IELTS test
adminAiRoutes.post('/generate-from-news', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { article, difficulty, questionCount } = req.body;
    if (!article || !article.title) {
      res.status(400).json({ success: false, error: 'Valid news article item is required' });
      return;
    }

    const generated = await adminGeneratorService.generateReadingFromNews({
      article,
      difficulty: difficulty || 'medium',
      questionCount: Number(questionCount) || 4,
    });

    res.json({ success: true, generated });
  } catch (error: any) {
    console.error('Generate reading from news error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate reading from news' });
  }
});

// POST /api/admin/ai/auto-pick-news-reading - AI reviews portals, picks best article, & generates IELTS test
adminAiRoutes.post('/auto-pick-news-reading', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { portalId, difficulty, questionCount } = req.body;

    const result = await adminGeneratorService.autoPickAndGenerateNewsReading({
      portalId: portalId || 'all',
      difficulty: difficulty || 'medium',
      questionCount: Number(questionCount) || 4,
    });

    res.json({
      success: true,
      pickedArticle: result.pickedArticle,
      reasonPicked: result.reasonPicked,
      generated: result.reading,
    });
  } catch (error: any) {
    console.error('Auto-pick news reading error:', error);
    res.status(500).json({ success: false, error: error.message || 'Auto-pick news reading failed' });
  }
});

// 1. Generate Reading Draft
adminAiRoutes.post('/generate-reading', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, difficulty, questionCount } = req.body;
    if (!topic) {
      res.status(400).json({ success: false, error: 'Topic is required' });
      return;
    }

    const generated = await adminGeneratorService.generateReading({
      topic,
      difficulty: difficulty || 'medium',
      questionCount: Number(questionCount) || 4,
    });

    res.json({ success: true, generated });
  } catch (error: any) {
    console.error('Admin AI generate reading error:', error);
    res.status(500).json({ success: false, error: error.message || 'Generation failed' });
  }
});

// 2. Publish Approved Reading
adminAiRoutes.post('/publish-reading', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = generatedReadingSchema.parse(req.body);
    const result = await adminGeneratorService.publishReading(parsed);
    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Publish reading error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to publish reading' });
  }
});

// 3. Generate Listening Draft
adminAiRoutes.post('/generate-listening', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, section, questionCount } = req.body;
    if (!topic) {
      res.status(400).json({ success: false, error: 'Topic is required' });
      return;
    }

    const generated = await adminGeneratorService.generateListening({
      topic,
      section: (Number(section) as 1 | 2 | 3 | 4) || 1,
      questionCount: Number(questionCount) || 3,
    });

    res.json({ success: true, generated });
  } catch (error: any) {
    console.error('Admin AI generate listening error:', error);
    res.status(500).json({ success: false, error: error.message || 'Generation failed' });
  }
});

// 4. Publish Approved Listening
adminAiRoutes.post('/publish-listening', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = generatedListeningSchema.parse(req.body);
    const result = await adminGeneratorService.publishListening(parsed, req.body.audioUrl);
    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Publish listening error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to publish listening' });
  }
});

// 5. Generate Writing Draft
adminAiRoutes.post('/generate-writing', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskType, topic } = req.body;
    if (!topic) {
      res.status(400).json({ success: false, error: 'Topic is required' });
      return;
    }

    const generated = await adminGeneratorService.generateWriting({
      taskType: taskType || 'task2',
      topic,
    });

    res.json({ success: true, generated });
  } catch (error: any) {
    console.error('Admin AI generate writing error:', error);
    res.status(500).json({ success: false, error: error.message || 'Generation failed' });
  }
});

// 6. Publish Approved Writing
adminAiRoutes.post('/publish-writing', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = generatedWritingSchema.parse(req.body);
    const result = await adminGeneratorService.publishWriting(parsed);
    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Publish writing error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to publish writing' });
  }
});

// 7. Generate Speaking Draft
adminAiRoutes.post('/generate-speaking', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      res.status(400).json({ success: false, error: 'Topic is required' });
      return;
    }

    const generated = await adminGeneratorService.generateSpeaking({ topic });
    res.json({ success: true, generated });
  } catch (error: any) {
    console.error('Admin AI generate speaking error:', error);
    res.status(500).json({ success: false, error: error.message || 'Generation failed' });
  }
});

// 8. Publish Approved Speaking
adminAiRoutes.post('/publish-speaking', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = generatedSpeakingSchema.parse(req.body);
    const result = await adminGeneratorService.publishSpeaking(parsed);
    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Publish speaking error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to publish speaking' });
  }
});
