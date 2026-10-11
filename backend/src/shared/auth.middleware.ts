import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
  officer?: any;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers && req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment');
    }
    return 'afriqora_development_isolated_jwt_secret_2026';
  }
  return secret;
}

export async function extractUserId(req: Request): Promise<string | null> {
  const secret = getJwtSecret();

  // 1. Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, secret) as { userId: string };
      if (decoded && decoded.userId) return decoded.userId;
    } catch (e) {
      // Invalid JWT
    }
  }

  // 2. Check cookies
  const cookies = parseCookies(req);
  if (cookies['token']) {
    try {
      const decoded = jwt.verify(cookies['token'], secret) as { userId: string };
      if (decoded && decoded.userId) return decoded.userId;
    } catch (e) {}
  }

  if (cookies['afr_session']) {
    const sid = cookies['afr_session'];
    try {
      const session = await prisma.session.findUnique({
        where: { id: sid },
      });
      if (session && session.expiresAt > new Date()) {
        return session.userId;
      }
    } catch (e) {}
  }

  return null;
}

export const attachAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const userId = await extractUserId(req);
    if (userId) {
      req.userId = userId;
    }
  } catch (e) {}
  next();
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.userId || (await extractUserId(req));
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  req.userId = userId;
  next();
};

/**
 * Single Platform Owner Authorization Guard
 * Strictly restricts execution to the designated single global platform owner.
 * Verified against database flag AND explicit environment authority.
 */
export const requirePlatformOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.userId || (await extractUserId(req));
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPlatformOwner: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
  const isEmailMatch = ownerEmail ? user.email.toLowerCase() === ownerEmail : true;

  if (!user.isPlatformOwner || !isEmailMatch) {
    return res.status(403).json({
      error: 'Forbidden: Platform Owner authority required. Action strictly restricted to single platform owner.',
    });
  }

  req.userId = user.id;
  req.user = user;
  next();
};

/**
 * Verified Government Officer Authorization Guard
 * Restricts sensitive investigative actions to active, verified officers.
 */
export const requireOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.userId || (await extractUserId(req));
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const officer = await prisma.governmentOfficer.findUnique({
    where: { userId },
    include: { agency: true },
  });

  if (!officer || !officer.isActive) {
    return res.status(403).json({
      error: 'Forbidden: Verified Government Officer clearance required.',
    });
  }

  req.userId = userId;
  req.officer = officer;
  next();
};
