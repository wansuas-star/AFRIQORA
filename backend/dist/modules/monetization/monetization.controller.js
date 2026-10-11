"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWithdrawal = exports.getMonetizationData = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
// GET /api/monetization
const getMonetizationData = async (req, res) => {
    try {
        let wallet = await prisma_1.default.wallet.findUnique({
            where: { userId: req.userId },
        });
        if (!wallet) {
            wallet = await prisma_1.default.wallet.create({
                data: {
                    userId: req.userId,
                    totalViews: 0,
                    earnings: 0.0,
                    availableBalance: 0.0,
                },
            });
        }
        const settings = await prisma_1.default.globalSettings.findFirst();
        res.json({
            wallet,
            settings: settings || {
                platformPct: 0.3,
                creatorPct: 0.7,
                viewValue: 0.01,
                totalEarnings: 0.0,
            },
        });
    }
    catch (error) {
        console.error('getMonetizationData error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMonetizationData = getMonetizationData;
// POST /api/monetization/withdraw
const requestWithdrawal = async (req, res) => {
    try {
        const { amount, method } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        const wallet = await prisma_1.default.wallet.findUnique({ where: { userId: req.userId } });
        if (!wallet || wallet.availableBalance < amount) {
            return res.status(400).json({ error: 'Insufficient available balance' });
        }
        const withdrawal = await prisma_1.default.withdrawal.create({
            data: {
                userId: req.userId,
                amount,
                method: method || 'bank',
                status: 'pending',
            },
        });
        await prisma_1.default.wallet.update({
            where: { userId: req.userId },
            data: { availableBalance: wallet.availableBalance - amount },
        });
        res.json({ ok: true, withdrawal });
    }
    catch (error) {
        console.error('requestWithdrawal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requestWithdrawal = requestWithdrawal;
