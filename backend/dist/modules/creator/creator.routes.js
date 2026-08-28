"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const creator_controller_1 = require("./creator.controller");
const auth_middleware_1 = require("../../shared/auth.middleware");
const router = (0, express_1.Router)();
// Authenticated routes
router.get('/dashboard', auth_middleware_1.requireAuth, creator_controller_1.getDashboard);
router.post('/business-profile', auth_middleware_1.requireAuth, creator_controller_1.updateBusinessProfile);
router.post('/withdraw', auth_middleware_1.requireAuth, creator_controller_1.requestWithdrawal);
// Public route
router.get('/:id', creator_controller_1.getCreatorProfile);
exports.default = router;
