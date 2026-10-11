import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

// GET /api/monetization
export const getMonetizationData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.userId!,
          totalViews: 0,
          earnings: 0.0,
          availableBalance: 0.0,
        },
      });
    }

    const settings = await prisma.globalSettings.findFirst();

    res.json({
      wallet,
      settings: settings || {
        platformPct: 0.3,
        creatorPct: 0.7,
        viewValue: 0.01,
        totalEarnings: 0.0,
      },
    });
  } catch (error) {
    console.error('getMonetizationData error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/monetization/withdraw
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
    if (!wallet || wallet.availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: req.userId!,
        amount,
        method: method || 'bank',
        status: 'pending',
      },
    });

    await prisma.wallet.update({
      where: { userId: req.userId },
      data: { availableBalance: wallet.availableBalance - amount },
    });

    res.json({ ok: true, withdrawal });
  } catch (error) {
    console.error('requestWithdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
