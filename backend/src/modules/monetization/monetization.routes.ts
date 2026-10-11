import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import { getMonetizationData, requestWithdrawal } from './monetization.controller';

const router = Router();

router.get('/', requireAuth, getMonetizationData);
router.post('/withdraw', requireAuth, requestWithdrawal);

export default router;
