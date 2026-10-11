import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getMerchantBusiness,
  submitVerification,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  recordAdClick,
  getMerchantAnalytics,
  depositBudget,
  getBillingHistory,
  upsertBusinessProfile,
} from './commercial.controller';

const router = Router();

router.get('/business', requireAuth, getMerchantBusiness);
router.post('/verification', requireAuth, submitVerification);
router.get('/campaigns', requireAuth, getCampaigns);
router.post('/campaigns', requireAuth, createCampaign);
router.put('/campaigns/:id/status', requireAuth, updateCampaignStatus);
router.post('/ads/click', recordAdClick);
router.get('/analytics', requireAuth, getMerchantAnalytics);
router.post('/billing/fund', requireAuth, depositBudget);
router.get('/billing/history', requireAuth, getBillingHistory);
router.post('/business-profile', requireAuth, upsertBusinessProfile);

export default router;
