import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import { recordView, getPlatformStats } from './monetization.controller';

const router = Router();

router.post('/view', recordView);          // view token already authenticates the viewer
router.get('/stats', requireAuth, getPlatformStats);

export default router;
