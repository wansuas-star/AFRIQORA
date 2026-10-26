"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOfficer = exports.requirePlatformOwner = exports.requireAuth = exports.attachAuth = void 0;
exports.getJwtSecret = getJwtSecret;
exports.extractUserId = extractUserId;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
function parseCookies(req) {
    const header = req.headers && req.headers.cookie;
    const out = {};
    if (!header)
        return out;
    header.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx === -1)
            return;
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        out[k] = decodeURIComponent(v);
    });
    return out;
}
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    const isInvalid = !secret || !secret.trim() || secret.includes('CHANGE_ME') || secret.length < 32;
    if (isInvalid) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing, predictable, or fewer than 32 characters in production environment');
        }
        return 'afriqora_development_isolated_jwt_secret_2026';
    }
    return secret;
}
async function extractUserId(req) {
    const secret = getJwtSecret();
    // 1. Check Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            if (decoded && decoded.userId)
                return decoded.userId;
        }
        catch (e) {
            // Invalid JWT
        }
    }
    // 2. Check cookies
    const cookies = parseCookies(req);
    if (cookies['token']) {
        try {
            const decoded = jsonwebtoken_1.default.verify(cookies['token'], secret);
            if (decoded && decoded.userId)
                return decoded.userId;
        }
        catch (e) { }
    }
    if (cookies['afr_session']) {
        const sid = cookies['afr_session'];
        try {
            const session = await prisma_1.default.session.findUnique({
                where: { id: sid },
            });
            if (session && session.expiresAt > new Date()) {
                return session.userId;
            }
        }
        catch (e) { }
    }
    return null;
}
const attachAuth = async (req, _res, next) => {
    try {
        const userId = await extractUserId(req);
        if (userId) {
            req.userId = userId;
            const user = await prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, isPlatformOwner: true },
            });
            if (user) {
                req.user = user;
            }
        }
    }
    catch (e) { }
    next();
};
exports.attachAuth = attachAuth;
const requireAuth = async (req, res, next) => {
    const userId = req.userId || (await extractUserId(req));
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    req.userId = userId;
    next();
};
exports.requireAuth = requireAuth;
/**
 * Single Platform Owner Authorization Guard
 * Strictly restricts execution to the designated single global platform owner.
 * Verified against database flag AND explicit environment authority.
 */
const requirePlatformOwner = async (req, res, next) => {
    const userId = req.userId || (await extractUserId(req));
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isPlatformOwner: true },
    });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
    const isEmailMatch = ownerEmail ? user.email.toLowerCase() === ownerEmail : true;
    if (!user.isPlatformOwner || !isEmailMatch) {
        return res.status(403).json({
            error: 'Forbidden: Platform Owner authority required. Action strictly restricted to single platform owner.',
        });
    }
    req.userId = user.id;
    req.user = user;
    next();
};
exports.requirePlatformOwner = requirePlatformOwner;
/**
 * Verified Government Officer Authorization Guard
 * Restricts sensitive investigative actions to active, verified officers.
 */
const requireOfficer = async (req, res, next) => {
    const userId = req.userId || (await extractUserId(req));
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    const officer = await prisma_1.default.governmentOfficer.findUnique({
        where: { userId },
        include: { agency: true },
    });
    if (!officer || !officer.isActive) {
        return res.status(403).json({
            error: 'Forbidden: Verified Government Officer clearance required.',
        });
    }
    req.userId = userId;
    req.officer = officer;
    next();
};
exports.requireOfficer = requireOfficer;
