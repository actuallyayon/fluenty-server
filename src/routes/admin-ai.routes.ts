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

export const adminAiRoutes = Router();

// Protect all admin AI routes with requireAdmin
adminAiRoutes.use(requireAdmin);

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
