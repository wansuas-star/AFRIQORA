import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        afriqoraId: true,
        email: true,
        displayName: true,
        username: true,
        bio: true,
        profilePhoto: true,
        location: true,
        website: true,
        contact: true,
        createdAt: true,
        businesses: {
          select: { id: true, businessName: true, isVerified: true, category: true }
        },
        wallet: {
          select: { availableBalance: true, earnings: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { displayName, username, bio, location, website, contact, profilePhoto } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        displayName: displayName || undefined,
        username: username || undefined,
        bio: bio !== undefined ? bio : undefined,
        location: location !== undefined ? location : undefined,
        website: website !== undefined ? website : undefined,
        contact: contact !== undefined ? contact : undefined,
        profilePhoto: profilePhoto !== undefined ? profilePhoto : undefined,
      },
      select: {
        id: true,
        afriqoraId: true,
        email: true,
        displayName: true,
        username: true,
        bio: true,
        profilePhoto: true,
        location: true,
        website: true,
        contact: true,
      }
    });
    res.json({ ok: true, user });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    await prisma.userBlock.create({
      data: {
        blockerId: req.userId!,
        blockedId: targetUserId,
      }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

export const getBlockedUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.userId },
      include: {
        blocked: { select: { id: true, displayName: true, profilePhoto: true } }
      }
    });
    res.json({ blockedUsers: blocks.map(b => b.blocked) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
