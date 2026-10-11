import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

// GET /api/admin/moderation/pending
export const getPendingModeration = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingCampaigns = await prisma.adCampaign.findMany({
      where: { status: 'pending_approval' },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
            category: true,
            location: true,
            owner: { select: { displayName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const pendingVerifications = await prisma.businessVerification.findMany({
      where: { status: 'pending' },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
            category: true,
            website: true,
            owner: { select: { displayName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      pendingCampaigns,
      pendingVerifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/admin/moderation/campaign/:id
export const moderateCampaign = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action, reason } = req.body; // action: "approve" | "reject"

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'active' : 'rejected',
        rejectionReason: action === 'reject' ? reason || 'Does not meet community guidelines' : null,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      campaign: updated,
      message: `Campaign ${action === 'approve' ? 'approved and activated' : 'rejected'}.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/admin/moderation/verification/:id
export const moderateVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action, adminNotes } = req.body; // action: "approve" | "reject"

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const verification = await prisma.businessVerification.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    const isApproved = action === 'approve';

    await prisma.$transaction(async (tx) => {
      await tx.businessVerification.update({
        where: { id },
        data: {
          status: isApproved ? 'approved' : 'rejected',
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
        },
      });

      await tx.businessProfile.update({
        where: { id: verification.businessId },
        data: {
          isVerified: isApproved,
          verificationStatus: isApproved ? 'verified' : 'rejected',
        },
      });
    });

    res.json({
      success: true,
      message: `Business verification ${isApproved ? 'approved' : 'rejected'}.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/commercial/overview
export const getPlatformCommercialOverview = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalCampaigns, activeCampaigns, verifiedBusinesses, totalRevenueResult] = await Promise.all([
      prisma.adCampaign.count(),
      prisma.adCampaign.count({ where: { status: 'active' } }),
      prisma.businessProfile.count({ where: { isVerified: true } }),
      prisma.merchantTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
    ]);

    res.json({
      totalCampaigns,
      activeCampaigns,
      verifiedBusinesses,
      totalCommercialRevenue: totalRevenueResult._sum.amount || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
