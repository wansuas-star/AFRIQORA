import { Router } from 'express';
import { getProfile, followUser } from './users.controller';
import { requireAuth } from '../../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/me', getProfile);
router.post('/:id/follow', followUser);

export default router;
