import { Router } from 'express';
import { requireAuth, requirePlatformOwner } from '../../shared/auth.middleware';
import {
  getPendingModeration,
  moderateCampaign,
  moderateVerification,
  getPlatformCommercialOverview,
} from './admin.controller';

const router = Router();

// Platform Owner Protected Admin Routes
router.get('/moderation/pending', requireAuth, requirePlatformOwner, getPendingModeration);
router.post('/moderation/campaign/:id', requireAuth, requirePlatformOwner, moderateCampaign);
router.post('/moderation/verification/:id', requireAuth, requirePlatformOwner, moderateVerification);
router.get('/commercial/overview', requireAuth, requirePlatformOwner, getPlatformCommercialOverview);

export default router;
