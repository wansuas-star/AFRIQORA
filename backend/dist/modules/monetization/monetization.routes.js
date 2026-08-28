"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monetization_controller_1 = require("./monetization.controller");
const router = (0, express_1.Router)();
router.post('/view', monetization_controller_1.recordView);
exports.default = router;
