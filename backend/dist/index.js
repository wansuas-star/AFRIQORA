"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.satelliteLimiter = exports.authLimiter = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4001;
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const monetization_routes_1 = __importDefault(require("./modules/monetization/monetization.routes"));
const connect_routes_1 = __importDefault(require("./modules/connect/connect.routes"));
const search_routes_1 = __importDefault(require("./modules/search/search.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const commercial_routes_1 = __importDefault(require("./modules/commercial/commercial.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const satellite_routes_1 = __importDefault(require("./modules/satellite/satellite.routes"));
const government_routes_1 = __importDefault(require("./modules/government/government.routes"));
const conflict_routes_1 = __importDefault(require("./modules/conflict/conflict.routes"));
// Decommissioned Social Media Routers
const feed_routes_1 = __importDefault(require("./modules/feed/feed.routes"));
const creator_routes_1 = __importDefault(require("./modules/creator/creator.routes"));
const messaging_routes_1 = __importDefault(require("./modules/messaging/messaging.routes"));
// Native HTTP Security Headers
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});
// Production-hardened CORS Whitelist
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4000',
    'http://localhost:4001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:4001',
];
const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);
const isOriginAllowed = (origin) => {
    if (allowedOrigins.has(origin))
        return true;
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return true;
    }
    return false;
};
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
        }
        else {
            callback(null, false);
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate Limiting (Step 4 Security Hardening)
const isDev = process.env.NODE_ENV !== 'production';
// 1. Sensitive Authentication Rate Limiter (Brute-force and credential stuffing defense)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: isDev ? 100 : 20, // 20 requests per IP in production, 100 in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});
// 2. High-Capacity Satellite Rate Limiter (Compute and raster protection)
// Generous threshold guarantees that analysts and normal map telemetry are never blocked
exports.satelliteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1-minute window
    max: isDev ? 300 : 120, // 120 requests/minute in production, 300 in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        error: 'Rate limit exceeded for satellite intelligence operations. Please throttle requests.',
        code: 'SATELLITE_RATE_LIMIT_EXCEEDED',
    },
});
app.use((req, _res, next) => {
    if (!req.url.startsWith('/assets') && !req.url.endsWith('.ico') && !req.url.endsWith('.png')) {
        console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url);
    }
    next();
});
// Flagship Satellite Earth Observation Intelligence API (ML-01 Foundation)
app.use('/api/satellite', exports.satelliteLimiter, satellite_routes_1.default);
// Conflict Intelligence Module (Eastern DRC & Resource Corridor Surveillance)
app.use('/api/conflict', conflict_routes_1.default);
// Government Investigative Intelligence & Universal Integration API
app.use('/api/gov', government_routes_1.default);
// Core Enterprise, Identity & Commercial API Routes
app.use('/api/auth', exports.authLimiter, auth_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/commercial', commercial_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/monetization', monetization_routes_1.default);
app.use('/api/connect', connect_routes_1.default);
app.use('/api/search', search_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
// Decommissioned Social Media Endpoints (HTTP 410 Gone)
const decommissionedSocialHandler = (_req, res) => {
    res.status(410).json({
        error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media functionality has been permanently decommissioned.',
        code: 'SOCIAL_MEDIA_DECOMMISSIONED'
    });
};
app.use('/api/feed', feed_routes_1.default);
app.use('/api/creator', creator_routes_1.default);
app.use('/api/messages', messaging_routes_1.default);
app.use('/api/messaging', messaging_routes_1.default);
app.use('/api/interactions', decommissionedSocialHandler);
app.use('/api/comments', decommissionedSocialHandler);
app.use('/api/social', decommissionedSocialHandler);
// Decommissioned Marketplace Endpoints (HTTP 410 Gone)
const decommissionedMarketplaceHandler = (_req, res) => {
    res.status(410).json({
        error: 'AFRIQORA is an African space-technology, satellite intelligence and information platform. Marketplace functionality has been permanently decommissioned.',
        code: 'MARKETPLACE_DECOMMISSIONED'
    });
};
app.use('/api/marketplace', decommissionedMarketplaceHandler);
app.use('/api/market', decommissionedMarketplaceHandler);
app.use('/api/shop', decommissionedMarketplaceHandler);
app.use('/api/products', decommissionedMarketplaceHandler);
app.use('/api/cart', decommissionedMarketplaceHandler);
// Health checks
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'staging',
        timestamp: new Date().toISOString(),
        platform: 'AFRIQORA Satellite Intelligence & Space Technologies (ML-01)',
        version: '2.0.0-staging'
    });
});
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        now: Date.now(),
        environment: process.env.NODE_ENV || 'staging',
        platform: 'AFRIQORA Satellite Intelligence & Space Technologies (ML-01)'
    });
});
// Serve frontend production build if available
const frontendDistPaths = [
    path_1.default.join(__dirname, '../../frontend/dist'),
    path_1.default.join(__dirname, '../../../frontend/dist'),
    path_1.default.join(process.cwd(), 'frontend/dist'),
    path_1.default.join(process.cwd(), '../frontend/dist')
];
let frontendDist = '';
for (const p of frontendDistPaths) {
    if (fs_1.default.existsSync(path_1.default.join(p, 'index.html'))) {
        frontendDist = p;
        break;
    }
}
if (frontendDist) {
    console.log('Serving frontend staging build from: ' + frontendDist);
    app.use(express_1.default.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.url.startsWith('/api')) {
            return res.sendFile(path_1.default.join(frontendDist, 'index.html'));
        }
        next();
    });
}
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: { message: err.message || 'Internal Server Error' },
    });
});
app.listen(port, () => {
    console.log('======================================================================');
    console.log('AFRIQORA Satellite Intelligence & Space Technologies Staging Online');
    console.log('URL: http://localhost:' + port);
    console.log('Health Check: http://localhost:' + port + '/api/health');
    console.log('Satellite API: http://localhost:' + port + '/api/satellite/status');
    console.log('======================================================================');
});
exports.default = app;
