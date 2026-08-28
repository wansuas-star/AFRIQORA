"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFollowStatus = exports.unfollowUser = exports.followUser = exports.getProfile = void 0;
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
                bio: true,
                profilePhoto: true,
                createdAt: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
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
const followUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        if (targetUserId === req.userId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        const targetUser = await prisma_1.default.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }
        const existingFollow = await prisma_1.default.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: req.userId,
                    followingId: targetUserId
                }
            }
        });
        if (existingFollow) {
            await prisma_1.default.follow.delete({
                where: { id: existingFollow.id }
            });
            return res.json({ status: 'unfollowed' });
        }
        else {
            await prisma_1.default.follow.create({
                data: {
                    followerId: req.userId,
                    followingId: targetUserId
                }
            });
            return res.json({ status: 'followed' });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.followUser = followUser;
const unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        if (targetUserId === req.userId) {
            return res.status(400).json({ error: 'Cannot unfollow yourself' });
        }
        const existingFollow = await prisma_1.default.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: req.userId,
                    followingId: targetUserId
                }
            }
        });
        if (existingFollow) {
            await prisma_1.default.follow.delete({
                where: { id: existingFollow.id }
            });
            return res.json({ status: 'unfollowed' });
        }
        else {
            return res.json({ status: 'not_following' });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.unfollowUser = unfollowUser;
const checkFollowStatus = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const existingFollow = await prisma_1.default.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: req.userId,
                    followingId: targetUserId
                }
            }
        });
        res.json({ following: !!existingFollow });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkFollowStatus = checkFollowStatus;
