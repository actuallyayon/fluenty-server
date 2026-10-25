import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { collections } from '../db/index.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  banned?: boolean;
  banReason?: string;
  banExpires?: Date | number;
  image?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

/**
 * Middleware requiring valid session and verifying user is not banned.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
      return;
    }

    const user = session.user as AuthenticatedUser;

    // Check banned status from Better Auth or profile
    if (user.banned) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Your account has been suspended',
        banReason: user.banReason,
      });
      return;
    }

    req.user = user;
    req.session = session.session as unknown as AuthenticatedRequest['session'];
    next();
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error validating authentication',
    });
  }
}

/**
 * Middleware requiring admin role.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator privileges required',
      });
      return;
    }
    next();
  });
}
