"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../shared/auth.middleware");
const users_controller_1 = require("./users.controller");
const router = (0, express_1.Router)();
router.get('/profile', auth_middleware_1.requireAuth, users_controller_1.getProfile);
router.get('/me', auth_middleware_1.requireAuth, users_controller_1.getProfile);
router.put('/profile', auth_middleware_1.requireAuth, users_controller_1.updateProfile);
router.post('/block/:id', auth_middleware_1.requireAuth, users_controller_1.blockUser);
router.get('/blocks', auth_middleware_1.requireAuth, users_controller_1.getBlockedUsers);
// Decommissioned social follow (HTTP 410 Gone)
router.use('/:id/follow', (_req, res) => {
    res.status(410).json({
        error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media following has been permanently decommissioned.',
        code: 'SOCIAL_MEDIA_DECOMMISSIONED',
    });
});
exports.default = router;
