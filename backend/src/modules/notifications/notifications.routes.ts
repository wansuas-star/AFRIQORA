import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  sendConnectionRequest,
  respondConnectionRequest,
} from './notifications.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markNotificationRead);
router.post('/connections/request', sendConnectionRequest);
router.post('/connections/respond', respondConnectionRequest);

export default router;
