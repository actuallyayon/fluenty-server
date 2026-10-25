import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { practiceRepository } from '../repositories/practice.repository.js';

export const practiceRoutes = Router();

// Protect all practice endpoints with authentication
practiceRoutes.use(requireAuth);

// ==========================================
// 1. Reading Practice Endpoints
// ==========================================

// GET /api/practice/reading/passages - List all published reading passages
practiceRoutes.get('/reading/passages', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const passages = await practiceRepository.getPublishedPassages();
    res.json({ success: true, passages });
  } catch (error) {
    console.error('Error in GET /api/practice/reading/passages:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve reading passages' });
  }
});

// GET /api/practice/reading/passages/:id - Get single passage for practice
practiceRoutes.get('/reading/passages/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await practiceRepository.getPassageForPractice(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Passage not found or not published' });
      return;
    }
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Error in GET /api/practice/reading/passages/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve passage' });
  }
});

const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1, 'questionId is required'),
      userAnswer: z.string().default(''),
    })
  ),
  timeSpentSeconds: z.number().int().min(0).default(0),
});

// POST /api/practice/reading/passages/:id/submit - Submit reading answers for instant scoring
practiceRoutes.post(
  '/reading/passages/:id/submit',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const parsed = submitAttemptSchema.parse(req.body);

      const result = await practiceRepository.submitReadingAttempt(
        userId,
        req.params.id,
        parsed.answers,
        parsed.timeSpentSeconds
      );

      if (!result) {
        res.status(404).json({ success: false, error: 'Passage not found or has no questions' });
        return;
      }

      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
        return;
      }
      console.error('Error in POST /api/practice/reading/passages/:id/submit:', error);
      res.status(500).json({ success: false, error: 'Failed to score reading attempt' });
    }
  }
);

// ==========================================
// 2. Listening Practice Endpoints
// ==========================================

// GET /api/practice/listening/items - List all published listening modules
practiceRoutes.get('/listening/items', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await practiceRepository.getPublishedListeningItems();
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error in GET /api/practice/listening/items:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve listening items' });
  }
});

// GET /api/practice/listening/items/:id - Get single listening item for practice
practiceRoutes.get('/listening/items/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await practiceRepository.getListeningItemForPractice(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Listening item not found or not published' });
      return;
    }
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Error in GET /api/practice/listening/items/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve listening item' });
  }
});

// POST /api/practice/listening/items/:id/submit - Submit listening answers for scoring
practiceRoutes.post(
  '/listening/items/:id/submit',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const parsed = submitAttemptSchema.parse(req.body);

      const result = await practiceRepository.submitListeningAttempt(
        userId,
        req.params.id,
        parsed.answers,
        parsed.timeSpentSeconds
      );

      if (!result) {
        res
          .status(404)
          .json({ success: false, error: 'Listening item not found or has no questions' });
        return;
      }

      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
        return;
      }
      console.error('Error in POST /api/practice/listening/items/:id/submit:', error);
      res.status(500).json({ success: false, error: 'Failed to score listening attempt' });
    }
  }
);

// ==========================================
// 3. Mistake Notebook Endpoints
// ==========================================

// GET /api/practice/mistakes - List user's saved mistakes with optional filters
practiceRoutes.get('/mistakes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const practiceType =
      req.query.practiceType === 'reading' || req.query.practiceType === 'listening'
        ? (req.query.practiceType as 'reading' | 'listening')
        : undefined;

    let resolved: boolean | undefined = undefined;
    if (req.query.resolved === 'true') resolved = true;
    if (req.query.resolved === 'false') resolved = false;

    const mistakes = await practiceRepository.getMistakes(userId, { practiceType, resolved });
    res.json({ success: true, mistakes });
  } catch (error) {
    console.error('Error in GET /api/practice/mistakes:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve mistakes' });
  }
});

// PATCH /api/practice/mistakes/:id/resolve - Toggle mistake resolved status
practiceRoutes.patch('/mistakes/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const updated = await practiceRepository.toggleMistakeResolved(userId, req.params.id);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Mistake not found' });
      return;
    }
    res.json({
      success: true,
      mistake: {
        id: updated._id.toString(),
        resolved: updated.resolved,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/practice/mistakes/:id/resolve:', error);
    res.status(500).json({ success: false, error: 'Failed to update mistake status' });
  }
});

// DELETE /api/practice/mistakes/:id - Delete a mistake from the notebook
practiceRoutes.delete('/mistakes/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const deleted = await practiceRepository.deleteMistake(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Mistake not found or already deleted' });
      return;
    }
    res.json({ success: true, message: 'Mistake deleted' });
  } catch (error) {
    console.error('Error in DELETE /api/practice/mistakes/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete mistake' });
  }
});

// ==========================================
// 4. Practice Attempts History
// ==========================================

// GET /api/practice/attempts - Recent practice attempts
practiceRoutes.get('/attempts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const attempts = await practiceRepository.getUserAttempts(userId, limit);
    res.json({ success: true, attempts });
  } catch (error) {
    console.error('Error in GET /api/practice/attempts:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve attempts' });
  }
});
