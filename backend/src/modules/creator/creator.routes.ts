import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getDashboard,
  upsertBusinessProfile,
  getPublicProfile,
  requestWithdrawal,
} from './creator.controller';

const router = Router();

router.get('/dashboard', requireAuth, getDashboard);
router.post('/business-profile', requireAuth, upsertBusinessProfile);
router.post('/withdraw', requireAuth, requestWithdrawal);
router.get('/:id', getPublicProfile); // public – no auth required

export default router;
