import { Response } from 'express';
import { createHash } from 'crypto';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

// GET /api/commercial/business
export const getMerchantBusiness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
      include: {
        verification: true,
        campaigns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found for this account' });
    }

    res.json({ business });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/commercial/verify
export const submitVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { registrationNumber, taxId, documentUrl, documentsUrl, businessName, category, location, country } = req.body;
    const finalDocUrl = documentUrl || documentsUrl || null;

    let business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      if (!businessName) {
        return res.status(404).json({ error: 'Business profile required before applying for verification' });
      }
      business = await prisma.businessProfile.create({
        data: {
          ownerId: userId,
          businessName,
          category: category || 'Technology',
          location: location || null,
          country: country || 'KE',
          verificationStatus: 'pending',
        },
      });
    }

    const verification = await prisma.businessVerification.upsert({
      where: { businessId: business.id },
      update: {
        registrationNumber: registrationNumber || null,
        taxId: taxId || null,
        documentUrl: finalDocUrl,
        status: 'pending',
        reviewedAt: null,
        adminNotes: null,
      },
      create: {
        businessId: business.id,
        registrationNumber: registrationNumber || null,
        taxId: taxId || null,
        documentUrl: finalDocUrl,
        status: 'pending',
      },
    });

    await prisma.businessProfile.update({
      where: { id: business.id },
      data: { verificationStatus: 'pending' },
    });

    res.json({ success: true, verification, message: 'Verification request submitted successfully' });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/commercial/campaigns
export const getCampaigns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ campaigns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/commercial/campaigns
export const createCampaign = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      title,
      placement = 'all',
      targetCategory,
      targetLocation,
      dailyBudget,
      totalBudget,
      headline,
      description,
      ctaText = 'Visit Store',
      ctaUrl,
      mediaUrl,
    } = req.body;

    if (!title || !headline) {
      return res.status(400).json({ error: 'Campaign title and promotional headline are required' });
    }

    const parsedDailyBudget = parseFloat(dailyBudget);
    const parsedTotalBudget = parseFloat(totalBudget);

    if (isNaN(parsedDailyBudget) || parsedDailyBudget <= 0) {
      return res.status(400).json({ error: 'Daily budget must be a positive number' });
    }

    if (isNaN(parsedTotalBudget) || parsedTotalBudget < parsedDailyBudget) {
      return res.status(400).json({ error: 'Total budget must be greater than or equal to daily budget' });
    }

    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Register your business profile before creating ad campaigns' });
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        businessId: business.id,
        title,
        placement,
        targetCategory: targetCategory || null,
        targetLocation: targetLocation || null,
        dailyBudget: parsedDailyBudget,
        totalBudget: parsedTotalBudget,
        headline,
        description: description || null,
        ctaText,
        ctaUrl: ctaUrl || business.website || null,
        mediaUrl: mediaUrl || business.logo || null,
        status: 'pending_approval', // Requires admin moderation
      },
    });

    res.status(201).json({
      success: true,
      campaign,
      message: 'Campaign created successfully and queued for admin safety review.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/commercial/campaigns/:id/status
export const updateCampaignStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Merchants may only toggle status between active and paused' });
    }

    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const campaign = await prisma.adCampaign.findFirst({
      where: { id, businessId: business.id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'pending_approval' || campaign.status === 'rejected') {
      return res.status(400).json({ error: `Cannot toggle campaign in '${campaign.status}' state` });
    }

    if (campaign.spentAmount >= campaign.totalBudget) {
      return res.status(400).json({ error: 'Campaign budget is exhausted. Deposit funds to reactivate.' });
    }

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, campaign: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/commercial/ads/click
export const recordAdClick = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaignId, nonce } = req.body;

    if (!campaignId || !nonce) {
      return res.status(400).json({ error: 'Missing campaignId or anti-replay nonce' });
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const viewerHash = createHash('sha256').update(`${req.userId || ip}:${campaignId}`).digest('hex');

    // 1. Anti-fraud check: Prevent duplicate click replay
    const existingNonce = await prisma.adEventNonce.findUnique({
      where: {
        campaignId_nonce_eventType: { campaignId, nonce, eventType: 'click' },
      },
    });

    if (existingNonce) {
      return res.status(409).json({ error: 'Duplicate click event recorded' });
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign is not currently active' });
    }

    // 2. Atomic click transaction: record event, increment clicks, deduct spend, auto-pause if exhausted
    const newSpent = campaign.spentAmount + campaign.cpcRate;
    const isExhausted = newSpent >= campaign.totalBudget;

    await prisma.$transaction(async (tx) => {
      await tx.adEventNonce.create({
        data: {
          campaignId,
          viewerHash,
          eventType: 'click',
          nonce,
        },
      });

      await tx.adCampaign.update({
        where: { id: campaignId },
        data: {
          clicks: { increment: 1 },
          spentAmount: { increment: campaign.cpcRate },
          status: isExhausted ? 'completed' : campaign.status,
        },
      });
    });

    res.json({
      success: true,
      targetUrl: campaign.ctaUrl || '/',
      exhausted: isExhausted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/commercial/analytics
export const getMerchantAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { businessId: business.id },
    });

    const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalSpent = campaigns.reduce((acc, c) => acc + c.spentAmount, 0);
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Privacy safeguard: Return ONLY aggregated cohort counts
    res.json({
      metrics: {
        activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
        totalImpressions,
        totalClicks,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        averageCtr: parseFloat(averageCtr.toFixed(2)),
      },
      campaignSummaries: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        impressions: c.impressions,
        clicks: c.clicks,
        spent: c.spentAmount,
        budget: c.totalBudget,
        ctr: c.impressions > 0 ? parseFloat(((c.clicks / c.impressions) * 100).toFixed(2)) : 0,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/commercial/billing/deposit
export const depositBudget = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { campaignId, amount, paymentMethod = 'mpesa_mock', reference } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount required' });
    }

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference required for idempotent billing' });
    }

    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    // Check duplicate reference
    const existingTx = await prisma.merchantTransaction.findUnique({
      where: { reference },
    });

    if (existingTx) {
      return res.status(409).json({ error: 'Transaction reference already processed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.merchantTransaction.create({
        data: {
          businessId: business.id,
          campaignId: campaignId || null,
          amount: parsedAmount,
          currency: 'USD',
          paymentMethod,
          status: 'completed',
          reference,
          description: campaignId ? `Budget top-up for campaign ${campaignId}` : 'Commercial account deposit',
        },
      });

      if (campaignId) {
        await tx.adCampaign.update({
          where: { id: campaignId },
          data: {
            totalBudget: { increment: parsedAmount },
            status: 'active', // Reactivate if paused due to budget
          },
        });
      }

      return transaction;
    });

    res.json({
      success: true,
      transaction: result,
      message: 'Deposit processed successfully.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/commercial/billing/history
export const getBillingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const business = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const transactions = await prisma.merchantTransaction.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/commercial/business-profile
export const upsertBusinessProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }

  const {
    businessName,
    category,
    description,
    location,
    country,
    phone,
    website,
    logo,
    hours,
    categories,
    services,
    socialLinks,
    serviceAreas,
    languagesServed,
    faqs,
    media,
    isMarketplace,
  } = req.body;

  if (!businessName) {
    res.status(400).json({ error: { message: 'Business name is required' } });
    return;
  }

  try {
    const existing = await prisma.businessProfile.findFirst({
      where: { ownerId: userId },
    });

    const dataPayload: any = {
      businessName,
      category: category || 'General',
      description: description || null,
      location: location || null,
      country: country || null,
      phone: phone || null,
      website: website || null,
      logo: logo || null,
      hours: hours ? (typeof hours === 'string' ? hours : JSON.stringify(hours)) : null,
      categories: categories ? (typeof categories === 'string' ? categories : JSON.stringify(categories)) : null,
      services: services ? (typeof services === 'string' ? services : JSON.stringify(services)) : null,
      socialLinks: socialLinks ? (typeof socialLinks === 'string' ? socialLinks : JSON.stringify(socialLinks)) : null,
      serviceAreas: serviceAreas ? (typeof serviceAreas === 'string' ? serviceAreas : JSON.stringify(serviceAreas)) : null,
      languagesServed: languagesServed ? (typeof languagesServed === 'string' ? languagesServed : JSON.stringify(languagesServed)) : null,
      faqs: faqs ? (typeof faqs === 'string' ? faqs : JSON.stringify(faqs)) : null,
      media: media ? (typeof media === 'string' ? media : JSON.stringify(media)) : null,
      isMarketplace: false,
    };

    let profile;
    if (existing) {
      profile = await prisma.businessProfile.update({
        where: { id: existing.id },
        data: dataPayload,
      });
    } else {
      profile = await prisma.businessProfile.create({
        data: {
          ...dataPayload,
          ownerId: userId,
        },
      });
    }

    res.status(200).json({ ok: true, profile, businessProfile: profile });
  } catch (err: any) {
    console.error('Error saving business profile:', err);
    res.status(500).json({ error: { message: err.message || 'Internal error' } });
  }
};
