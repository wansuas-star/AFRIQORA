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

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isInvalid = !secret || !secret.trim() || secret.includes('CHANGE_ME') || secret.length < 32;
  if (isInvalid) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing, predictable, or fewer than 32 characters in production environment');
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isPlatformOwner: true },
      });
      if (user) {
        req.user = user;
      }
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

export function getPlatformOwnerEmail(): string {
  return (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
}

/**
 * Canonical Single-Owner Verification Rule:
 * 1. User record must exist and have isPlatformOwner === true in the database.
 * 2. PLATFORM_OWNER_EMAIL must be explicitly configured in the environment (fails closed if missing).
 * 3. user.email must strictly match PLATFORM_OWNER_EMAIL (AND logic, never OR, zero fallback shortcuts).
 */
export function isVerifiedPlatformOwner(
  user?: { email?: string | null; isPlatformOwner?: boolean | null } | null
): boolean {
  if (!user || !user.email || !user.isPlatformOwner) {
    return false;
  }
  const ownerEmail = getPlatformOwnerEmail();
  if (!ownerEmail) {
    return false;
  }
  return Boolean(user.isPlatformOwner) && user.email.trim().toLowerCase() === ownerEmail;
}

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

  if (!isVerifiedPlatformOwner(user)) {
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
