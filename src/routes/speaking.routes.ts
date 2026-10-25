import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { speakingRepository } from '../repositories/speaking.repository.js';

export const speakingRoutes = Router();

speakingRoutes.use(requireAuth);

// GET /api/speaking/cues - List published speaking topics / cue cards
speakingRoutes.get('/cues', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cues = await speakingRepository.getPublishedCueCards();
    res.json({ success: true, cues });
  } catch (error) {
    console.error('Error in GET /api/speaking/cues:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve speaking cue cards' });
  }
});

// GET /api/speaking/cues/:id - Get single cue card details
speakingRoutes.get('/cues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cue = await speakingRepository.getCueCardById(req.params.id);
    if (!cue) {
      res.status(404).json({ success: false, error: 'Cue card not found' });
      return;
    }
    res.json({
      success: true,
      cue: {
        id: cue._id.toString(),
        topic: cue.topic,
        topicBn: cue.topicBn,
        cueCard: cue.cueCard,
        cueCardBn: cue.cueCardBn,
        bulletPoints: cue.bulletPoints,
        bulletPointsBn: cue.bulletPointsBn,
        part: cue.part,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/speaking/cues/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve cue card' });
  }
});

const startSessionSchema = z.object({
  cueCardId: z.string().min(1, 'cueCardId is required'),
});

// POST /api/speaking/sessions/start - Start a new interactive speaking practice session
speakingRoutes.post('/sessions/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cueCardId } = startSessionSchema.parse(req.body);

    const session = await speakingRepository.startSession(userId, cueCardId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Cue card not found' });
      return;
    }

    res.json({ success: true, ...session });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/speaking/sessions/start:', error);
    res.status(500).json({ success: false, error: 'Failed to start speaking session' });
  }
});

const sendMessageSchema = z
  .object({
    candidateAnswer: z.string().optional(),
    answer: z.string().optional(),
    part: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    currentPart: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .refine((data) => Boolean((data.candidateAnswer || data.answer)?.trim()), {
    message: 'Message content cannot be blank',
    path: ['candidateAnswer'],
  })
  .transform((data) => ({
    candidateAnswer: (data.candidateAnswer || data.answer || '').trim(),
    part: ((data.part || data.currentPart || 1) as 1 | 2 | 3),
  }));

// POST /api/speaking/sessions/:id/message - Send candidate answer and get examiner reply
speakingRoutes.post('/sessions/:id/message', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { candidateAnswer, part } = sendMessageSchema.parse(req.body);

    const result = await speakingRepository.sendCandidateMessage(
      userId,
      req.params.id,
      candidateAnswer,
      part
    );

    if (!result) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/speaking/sessions/:id/message:', error);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// POST /api/speaking/sessions/:id/finish - Conclude interview and evaluate with Gemini
speakingRoutes.post('/sessions/:id/finish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await speakingRepository.finishAndEvaluateSession(userId, req.params.id);
    if (!result) {
      res.status(404).json({ success: false, error: 'Session not found or empty' });
      return;
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error in POST /api/speaking/sessions/:id/finish:', error);
    res.status(error.message?.includes('limit reached') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to evaluate speaking session',
    });
  }
});

// GET /api/speaking/sessions - Past speaking sessions list
speakingRoutes.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const sessions = await speakingRepository.getUserSessions(userId, limit);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error in GET /api/speaking/sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve sessions' });
  }
});

// GET /api/speaking/sessions/:id - Get session transcript and feedback
speakingRoutes.get('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = await speakingRepository.getSessionDetail(userId, req.params.id);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    res.json({
      success: true,
      session: {
        id: session._id.toString(),
        topic: session.cueCardPrompt,
        transcript: session.transcript,
        feedback: session.feedback,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/speaking/sessions/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve session detail' });
  }
});
