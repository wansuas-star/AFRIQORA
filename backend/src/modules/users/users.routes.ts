import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import { getProfile, updateProfile, blockUser, getBlockedUsers } from './users.controller';

const router = Router();

router.get('/profile', requireAuth, getProfile);
router.get('/me', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/block/:id', requireAuth, blockUser);
router.get('/blocks', requireAuth, getBlockedUsers);

// Decommissioned social follow (HTTP 410 Gone)
router.use('/:id/follow', (_req, res) => {
  res.status(410).json({
    error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media following has been permanently decommissioned.',
    code: 'SOCIAL_MEDIA_DECOMMISSIONED',
  });
});

export default router;
