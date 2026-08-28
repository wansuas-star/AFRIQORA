"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connect_controller_1 = require("./connect.controller");
const auth_middleware_1 = require("../../shared/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/services', connect_controller_1.getServices);
router.get('/permissions', connect_controller_1.getPermissions);
// Authenticated routes
router.use(auth_middleware_1.requireAuth);
router.post('/', connect_controller_1.connectService);
router.delete('/:service', connect_controller_1.disconnectService);
exports.default = router;
