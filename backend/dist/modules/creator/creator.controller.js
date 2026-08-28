"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWithdrawal = exports.getCreatorProfile = exports.updateBusinessProfile = exports.getDashboard = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const getDashboard = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: req.userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        let creatorStats = await prisma_1.default.wallet.findUnique({ where: { userId: user.id } });
        if (!creatorStats) {
            creatorStats = await prisma_1.default.wallet.create({
                data: { userId: user.id, totalViews: 0, earnings: 0, availableBalance: 0 }
            });
        }
        const myPosts = await prisma_1.default.post.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        const businessProfile = await prisma_1.default.businessProfile.findFirst({
            where: { ownerId: user.id }
        });
        res.json({
            ok: true,
            user: {
                id: user.id,
                afriqoraId: user.afriqoraId,
                email: user.email,
                displayName: user.displayName,
                createdAt: user.createdAt
            },
            creator: creatorStats,
            businessProfile,
            posts: myPosts
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboard = getDashboard;
const updateBusinessProfile = async (req, res) => {
    try {
        const { businessName, location, country, category, description, phone, website, logo } = req.body;
        let bProf = await prisma_1.default.businessProfile.findFirst({ where: { ownerId: req.userId } });
        if (bProf) {
            bProf = await prisma_1.default.businessProfile.update({
                where: { id: bProf.id },
                data: { businessName, location, country, category, description, phone, website, logo }
            });
        }
        else {
            bProf = await prisma_1.default.businessProfile.create({
                data: { ownerId: req.userId, businessName, location, country, category, description, phone, website, logo }
            });
        }
        res.json({ ok: true, profile: bProf });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateBusinessProfile = updateBusinessProfile;
const getCreatorProfile = async (req, res) => {
    try {
        const targetId = req.params.id; // Could be user.id or user.afriqoraId
        const user = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { id: targetId },
                    { afriqoraId: targetId }
                ]
            },
            include: {
                _count: { select: { followers: true, following: true } }
            }
        });
        if (!user)
            return res.status(404).json({ error: 'Creator not found' });
        const businessProfile = await prisma_1.default.businessProfile.findFirst({ where: { ownerId: user.id } });
        res.json({
            ok: true,
            creator: {
                id: user.id,
                afriqoraId: user.afriqoraId,
                displayName: user.displayName,
                bio: user.bio,
                profilePhoto: user.profilePhoto,
                createdAt: user.createdAt,
                followersCount: user._count?.followers || 0,
                businessProfile
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCreatorProfile = getCreatorProfile;
const requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        const requestedAmount = Number(amount) || 0;
        // We get PAYOUT_THRESHOLD from environment or fallback
        const PAYOUT_VIEWS_THRESHOLD = Number(process.env.PAYOUT_THRESHOLD) || 100;
        let settings = await prisma_1.default.globalSettings.findUnique({ where: { id: 'default' } });
        // Fetch wallet for threshold and balance
        let wallet = await prisma_1.default.wallet.findUnique({ where: { userId: req.userId } });
        if (!wallet) {
            wallet = await prisma_1.default.wallet.create({
                data: { userId: req.userId, totalViews: 0, earnings: 0, availableBalance: 0 }
            });
        }
        // Check threshold
        const creatorViews = wallet.totalViews;
        // In legacy, threshold could also be in settings, but we default to PAYOUT_VIEWS_THRESHOLD
        // Actually the legacy code used: (state.settings && state.settings.payoutThreshold) || PAYOUT_VIEWS_THRESHOLD
        // We don't have payoutThreshold in GlobalSettings yet, so we just use the env
        if (creatorViews < PAYOUT_VIEWS_THRESHOLD) {
            return res.status(400).json({
                error: `Withdrawal eligibility requires ${PAYOUT_VIEWS_THRESHOLD} valid views. You have ${creatorViews}.`
            });
        }
        // Check balance
        if (requestedAmount <= 0 || requestedAmount > wallet.availableBalance) {
            return res.status(400).json({ error: 'invalid amount' });
        }
        // Process Transaction
        const result = await prisma_1.default.$transaction(async (tx) => {
            const updatedWallet = await tx.wallet.update({
                where: { userId: req.userId },
                data: { availableBalance: wallet.availableBalance - requestedAmount }
            });
            const withdrawal = await tx.withdrawal.create({
                data: {
                    userId: req.userId,
                    amount: requestedAmount,
                    status: 'pending'
                }
            });
            return withdrawal;
        });
        res.json({ ok: true, withdrawal: result });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requestWithdrawal = requestWithdrawal;
