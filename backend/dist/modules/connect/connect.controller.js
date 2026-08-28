"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectService = exports.connectService = exports.getPermissions = exports.getServices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Keep parity with legacy CONNECT_PERMISSIONS
const CONNECT_PERMISSIONS = {
    google: ['View basic profile info', 'List Google accounts', 'Request offline access (refresh tokens)'],
    microsoft: ['View basic profile info', 'Sign in with Microsoft accounts', 'Request offline access (refresh tokens)'],
    'google-drive': ['View and manage Google Drive files (optional)', 'Read metadata and file list'],
    calendar: ['View and manage calendars', 'Create and edit events'],
    email: ['Read basic mailbox metadata', 'Send email on your behalf (optional)'],
    'cloud-storage': ['Upload and download files', 'List buckets and objects'],
    'business-services': ['Access basic business profile', 'Manage appointments and availability']
};
const getServices = async (req, res) => {
    try {
        const userId = req.query.userId || req.query.uid || 'anonymous';
        if (userId === 'anonymous') {
            return res.json({ userId, services: {} });
        }
        const connections = await prisma.serviceConnection.findMany({
            where: { userId: String(userId) }
        });
        const services = {};
        for (const conn of connections) {
            services[conn.serviceName] = {
                connected: true,
                createdAt: conn.createdAt,
                meta: { permissions: JSON.parse(conn.permissions || '[]') }
            };
        }
        res.json({ userId, services });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getServices = getServices;
const getPermissions = (req, res) => {
    const service = req.query.service;
    const perms = CONNECT_PERMISSIONS[service] || [];
    res.json({ service, permissions: perms });
};
exports.getPermissions = getPermissions;
const connectService = async (req, res) => {
    try {
        const { service } = req.body;
        if (!service)
            return res.status(400).json({ error: 'service required' });
        const perms = CONNECT_PERMISSIONS[service] || [];
        await prisma.serviceConnection.upsert({
            where: { userId_serviceName: { userId: req.userId, serviceName: String(service) } },
            update: { permissions: JSON.stringify(perms) },
            create: {
                userId: req.userId,
                serviceName: String(service),
                permissions: JSON.stringify(perms)
            }
        });
        res.json({ ok: true, service, connected: true, permissions: perms });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.connectService = connectService;
const disconnectService = async (req, res) => {
    try {
        const service = req.params.service;
        if (!service)
            return res.status(400).json({ error: 'service required' });
        await prisma.serviceConnection.deleteMany({
            where: { userId: req.userId, serviceName: String(service) }
        });
        res.json({ ok: true, service, connected: false });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.disconnectService = disconnectService;
