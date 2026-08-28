import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

const PAYOUT_VIEWS_THRESHOLD = parseInt(process.env.PAYOUT_VIEWS_THRESHOLD || '100', 10);

// GET /api/creator/dashboard
export const getDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [wallet, businessProfile, posts] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.businessProfile.findUnique({ where: { userId } }),
      prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { likes: true, comments: true } } },
      }),
    ]);

    res.json({
      wallet: wallet ?? { earnings: 0, views: 0 },
      businessProfile: businessProfile ?? null,
      posts,
      viewsThreshold: PAYOUT_VIEWS_THRESHOLD,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/creator/business-profile
export const upsertBusinessProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { businessName, category, description, website } = req.body;

    if (!businessName || !category) {
      return res.status(400).json({ error: 'businessName and category are required' });
    }

    const profile = await prisma.businessProfile.upsert({
      where: { userId },
      update: { businessName, category, description, website },
      create: { userId, businessName, category, description, website },
    });

    res.json({ businessProfile: profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/creator/:id  (resolve by UUID or afriqoraId)
export const getPublicProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userId = Array.isArray(id) ? id[0] : id;
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { afriqoraId: userId }] },
      select: {
        id: true,
        afriqoraId: true,
        displayName: true,
        bio: true,
        profilePhoto: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const businessProfile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });

    res.json({ user, businessProfile: businessProfile ?? null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/creator/withdraw
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const amount = parseFloat(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not found. No earnings recorded yet.' });
    }

    if (wallet.views < PAYOUT_VIEWS_THRESHOLD) {
      return res.status(403).json({
        error: `Minimum ${PAYOUT_VIEWS_THRESHOLD} views required to withdraw. You have ${wallet.views}.`,
      });
    }

    if (amount > wallet.earnings) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ${wallet.earnings.toFixed(2)}`,
      });
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { earnings: { decrement: amount } },
      });

      const wd = await tx.withdrawal.create({
        data: { walletId: updated.id, amount, status: 'pending' },
      });

      return wd;
    });

    res.json({ withdrawal, message: 'Withdrawal request submitted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
