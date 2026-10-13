import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  getSatelliteNotifications,
  markNotificationRead,
  markAllRead,
} from './notifications.controller';

const router = Router();

// Decommissioned social connection systems (HTTP 410 Gone)
router.use('/connections', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social connection systems have been permanently decommissioned.',
    code: 'SOCIAL_MEDIA_DECOMMISSIONED'
  });
});

router.use(requireAuth);

// Operational, system, and satellite intelligence notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/satellite', getSatelliteNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markNotificationRead);

export default router;
