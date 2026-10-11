import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

// GET /api/notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const cursor = parseInt((req.query.cursor as string) || '0', 10);

    const notifications = await prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      skip: isNaN(cursor) ? 0 : cursor,
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientUserId: userId, read: false },
    });

    res.json({
      ok: true,
      items: notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/notifications/:id/read
export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id: id as string, recipientUserId: userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });

    res.json({ ok: true, id: notification.id, read: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/notifications/read-all
export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await prisma.notification.updateMany({
      where: { recipientUserId: userId, read: false },
      data: { read: true },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

