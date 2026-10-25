import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { writingRepository } from '../repositories/writing.repository.js';

export const writingRoutes = Router();

writingRoutes.use(requireAuth);

// GET /api/writing/prompts - List published writing prompts
writingRoutes.get('/prompts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskType =
      req.query.taskType === 'task1' || req.query.taskType === 'task2'
        ? (req.query.taskType as 'task1' | 'task2')
        : undefined;

    const prompts = await writingRepository.getPublishedPrompts(taskType);
    res.json({ success: true, prompts });
  } catch (error) {
    console.error('Error in GET /api/writing/prompts:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve writing prompts' });
  }
});

// GET /api/writing/prompts/:id - Get single prompt
writingRoutes.get('/prompts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prompt = await writingRepository.getPromptById(req.params.id);
    if (!prompt) {
      res.status(404).json({ success: false, error: 'Prompt not found or not published' });
      return;
    }
    res.json({
      success: true,
      prompt: {
        id: prompt._id.toString(),
        taskType: prompt.taskType,
        title: prompt.title,
        prompt: prompt.prompt,
        imageUrl: prompt.imageUrl,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/writing/prompts/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve prompt' });
  }
});

const submitEssaySchema = z.object({
  essay: z
    .string()
    .min(50, 'Essay must contain at least 50 words to receive meaningful IELTS evaluation')
    .max(10000, 'Essay text exceeds maximum length'),
});

// POST /api/writing/prompts/:id/submit - Submit essay and evaluate with Gemini
writingRoutes.post('/prompts/:id/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { essay } = submitEssaySchema.parse(req.body);

    const result = await writingRepository.submitAndEvaluateEssay({
      userId,
      promptId: req.params.id,
      essay,
    });

    if (!result) {
      res.status(404).json({ success: false, error: 'Prompt not found' });
      return;
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/writing/prompts/:id/submit:', error);
    res.status(error.message?.includes('limit reached') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to evaluate essay with AI',
    });
  }
});

// GET /api/writing/submissions - List user's past essay evaluations
writingRoutes.get('/submissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const submissions = await writingRepository.getUserSubmissions(userId, limit);
    res.json({ success: true, submissions });
  } catch (error) {
    console.error('Error in GET /api/writing/submissions:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve submissions' });
  }
});

// GET /api/writing/submissions/:id - Get single essay evaluation breakdown
writingRoutes.get('/submissions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const submission = await writingRepository.getSubmissionDetail(userId, req.params.id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }
    res.json({ success: true, submission });
  } catch (error) {
    console.error('Error in GET /api/writing/submissions/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve submission details' });
  }
});
