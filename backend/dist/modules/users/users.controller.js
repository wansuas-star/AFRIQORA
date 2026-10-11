"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedUsers = exports.blockUser = exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const getProfile = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                afriqoraId: true,
                email: true,
                displayName: true,
                username: true,
                bio: true,
                profilePhoto: true,
                location: true,
                website: true,
                contact: true,
                createdAt: true,
                businesses: {
                    select: { id: true, businessName: true, isVerified: true, category: true }
                },
                wallet: {
                    select: { availableBalance: true, earnings: true }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { displayName, username, bio, location, website, contact, profilePhoto } = req.body;
        const user = await prisma_1.default.user.update({
            where: { id: req.userId },
            data: {
                displayName: displayName || undefined,
                username: username || undefined,
                bio: bio !== undefined ? bio : undefined,
                location: location !== undefined ? location : undefined,
                website: website !== undefined ? website : undefined,
                contact: contact !== undefined ? contact : undefined,
                profilePhoto: profilePhoto !== undefined ? profilePhoto : undefined,
            },
            select: {
                id: true,
                afriqoraId: true,
                email: true,
                displayName: true,
                username: true,
                bio: true,
                profilePhoto: true,
                location: true,
                website: true,
                contact: true,
            }
        });
        res.json({ ok: true, user });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
};
exports.updateProfile = updateProfile;
const blockUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        if (targetUserId === req.userId) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }
        await prisma_1.default.userBlock.create({
            data: {
                blockerId: req.userId,
                blockedId: targetUserId,
            }
        });
        res.json({ ok: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to block user' });
    }
};
exports.blockUser = blockUser;
const getBlockedUsers = async (req, res) => {
    try {
        const blocks = await prisma_1.default.userBlock.findMany({
            where: { blockerId: req.userId },
            include: {
                blocked: { select: { id: true, displayName: true, profilePhoto: true } }
            }
        });
        res.json({ blockedUsers: blocks.map(b => b.blocked) });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBlockedUsers = getBlockedUsers;
