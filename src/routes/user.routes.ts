import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';
import { profileRepository, formatProfile } from '../repositories/profile.repository.js';

export const userRoutes = Router();

// GET /api/me - Get current user profile and session data
userRoutes.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const profile = await profileRepository.ensureProfile({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
      profile: formatProfile(profile),
    });
  } catch (error) {
    console.error('Error in GET /api/me:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
});

const updateOnboardingSchema = z.object({
  targetBand: z.union([
    z.literal(6.0),
    z.literal(6.5),
    z.literal(7.0),
    z.literal(7.5),
    z.literal(8.0),
    z.literal(8.5),
    z.literal(9.0),
  ]),
  examDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

// POST /api/user/onboarding - Save onboarding details
userRoutes.post('/onboarding', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateOnboardingSchema.parse(req.body);
    const updated = await profileRepository.updateOnboarding(req.user!.id, {
      targetBand: parsed.targetBand,
      examDate: new Date(parsed.examDate),
      currentLevel: parsed.currentLevel,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    res.json({
      success: true,
      profile: formatProfile(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
      return;
    }
    console.error('Error in POST /api/user/onboarding:', error);
    res.status(500).json({ success: false, error: 'Failed to update onboarding' });
  }
});
