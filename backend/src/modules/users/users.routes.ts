import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import { getProfile, updateProfile, blockUser, getBlockedUsers } from './users.controller';

const router = Router();

router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/block/:id', requireAuth, blockUser);
router.get('/blocks', requireAuth, getBlockedUsers);

export default router;
