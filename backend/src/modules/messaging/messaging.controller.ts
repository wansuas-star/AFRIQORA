import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.userId!,
        receiverId,
        content
      }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const peerId = req.params.peerId as string;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: peerId },
          { senderId: peerId, receiverId: req.userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
