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
        bio: true,
        profilePhoto: true,
        createdAt: true,
        _count: {
          select: { followers: true, following: true, posts: true }
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

export const followUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.userId!,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      });
      return res.json({ status: 'unfollowed' });
    } else {
      await prisma.follow.create({
        data: {
          followerId: req.userId!,
          followingId: targetUserId
        }
      });
      return res.json({ status: 'followed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
