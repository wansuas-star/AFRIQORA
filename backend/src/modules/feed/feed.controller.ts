import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

export const createPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, mediaUrl, contentType } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        mediaUrl,
        contentType: contentType || 'post',
        authorId: req.userId!,
      }
    });

    res.status(201).json({ post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHomeFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profilePhoto: true,
            afriqoraId: true
          }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    res.json({ posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
