"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../shared/auth.middleware");
const monetization_controller_1 = require("./monetization.controller");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, monetization_controller_1.getMonetizationData);
router.post('/withdraw', auth_middleware_1.requireAuth, monetization_controller_1.requestWithdrawal);
exports.default = router;
