"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectService = exports.connectService = exports.getConnectedServices = exports.getPermissions = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
// Static permissions map (replicated from legacy)
const CONNECT_PERMISSIONS = {
    google: ['profile', 'email'],
    facebook: ['public_profile', 'email'],
    twitter: ['tweet.read', 'users.read'],
    instagram: ['user_profile', 'user_media'],
    tiktok: ['user.info.basic', 'video.list'],
};
// GET /api/connect/permissions
const getPermissions = (_req, res) => {
    res.json({ permissions: CONNECT_PERMISSIONS });
};
exports.getPermissions = getPermissions;
// GET /api/connect/services?userId=<id>
const getConnectedServices = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }
        const connections = await prisma_1.default.serviceConnection.findMany({
            where: { userId },
            select: { serviceName: true, permissions: true, createdAt: true },
        });
        res.json({ connections });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getConnectedServices = getConnectedServices;
// POST /api/connect
const connectService = async (req, res) => {
    try {
        const { serviceName, permissions } = req.body;
        const userId = req.userId;
        if (!serviceName || !CONNECT_PERMISSIONS[serviceName]) {
            return res.status(400).json({ error: `Unknown service: ${serviceName}` });
        }
        const serializedPermissions = Array.isArray(permissions)
            ? permissions.join(',')
            : (permissions ?? CONNECT_PERMISSIONS[serviceName].join(','));
        const connection = await prisma_1.default.serviceConnection.upsert({
            where: { userId_serviceName: { userId, serviceName } },
            update: { permissions: serializedPermissions },
            create: { userId, serviceName, permissions: serializedPermissions },
        });
        res.json({ connection });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.connectService = connectService;
// DELETE /api/connect/:service
const disconnectService = async (req, res) => {
    try {
        const rawService = req.params['service'];
        const serviceParam = Array.isArray(rawService) ? rawService[0] : rawService;
        const userId = req.userId;
        await prisma_1.default.serviceConnection.deleteMany({
            where: { userId, serviceName: serviceParam },
        });
        res.json({ success: true, message: `Disconnected from ${serviceParam}` });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.disconnectService = disconnectService;
