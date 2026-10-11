import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
} from './notifications.controller';

const router = Router();

// Decommissioned social connection requests (HTTP 410 Gone)
router.use('/connections', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social connection systems have been permanently decommissioned.',
    code: 'SOCIAL_MEDIA_DECOMMISSIONED'
  });
});

router.use(requireAuth);

// Operational, system, and intelligence notifications
router.get('/', getNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markNotificationRead);

export default router;
