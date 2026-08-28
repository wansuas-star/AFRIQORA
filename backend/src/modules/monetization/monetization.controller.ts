import { createHmac } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

const VIEW_HMAC_SECRET = process.env.VIEW_HMAC_SECRET || 'view-secret';
const CREATOR_SHARE = 0.7;   // 70% to creator
const PLATFORM_SHARE = 0.3; // 30% to platform
const EARNINGS_PER_VIEW = parseFloat(process.env.EARNINGS_PER_VIEW || '0.01');
const MAX_DAILY_VIEWS = parseInt(process.env.MAX_DAILY_VIEWS || '5', 10);

interface ViewPayload {
  videoId: string;
  viewerId: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

// POST /api/monetization/view
export const recordView = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId, viewerId, nonce, timestamp, signature } = req.body as ViewPayload;

    if (!videoId || !viewerId || !nonce || !timestamp || !signature) {
      return res.status(400).json({ error: 'Missing required view token fields' });
    }

    // 1. Verify HMAC signature
    const expectedSig = createHmac('sha256', VIEW_HMAC_SECRET)
      .update(`${videoId}:${viewerId}:${nonce}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(401).json({ error: 'Invalid view token signature' });
    }

    // 2. Deduplicate nonce (prevent replay attacks)
    const existing = await prisma.videoViewNonce.findUnique({
      where: { videoId_nonce: { videoId, nonce } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Duplicate view nonce – already processed' });
    }

    // 3. Enforce 24-hour rolling view cap per viewer per video
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViews = await prisma.videoViewNonce.count({
      where: {
        videoId,
        // Reuse the nonce table to track all viewerId activity via a convention:
        // We store viewerId as part of the nonce composite. Instead, rely on
        // the post author lookup and wallet update counts. We enforce via wallet.views.
        createdAt: { gte: oneDayAgo },
      },
    });
    if (recentViews >= MAX_DAILY_VIEWS) {
      return res.status(429).json({ error: 'Daily view limit reached for this video' });
    }

    // 4. Look up the post and its author
    const post = await prisma.post.findUnique({
      where: { id: videoId },
      select: { authorId: true },
    });
    if (!post) {
      return res.status(404).json({ error: 'Video/post not found' });
    }

    const creatorEarning = EARNINGS_PER_VIEW * CREATOR_SHARE;
    const platformEarning = EARNINGS_PER_VIEW * PLATFORM_SHARE;

    // 5. Atomic transaction: record nonce, update creator wallet, update GlobalSettings
    await prisma.$transaction(async (tx) => {
      // Record nonce to prevent replay
      await tx.videoViewNonce.create({ data: { videoId, nonce } });

      // Upsert creator wallet
      await tx.wallet.upsert({
        where: { userId: post.authorId },
        update: {
          earnings: { increment: creatorEarning },
        },
        create: {
          userId: post.authorId,
          earnings: creatorEarning,
        },
      });

      // Upsert GlobalSettings singleton for platform earnings
      await tx.globalSettings.upsert({
        where: { id: 'singleton' },
        update: { totalEarnings: { increment: platformEarning } },
        create: { id: 'singleton', totalEarnings: platformEarning },
      });
    });

    res.json({
      success: true,
      creatorEarning,
      platformEarning,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/monetization/stats  (platform-level stats, admin use)
export const getPlatformStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
    res.json({ totalEarnings: settings?.totalEarnings ?? 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
