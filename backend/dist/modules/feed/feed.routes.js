"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const decommissionedSocialHandler = (_req, res) => {
    res.status(410).json({
        error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media functionality has been permanently decommissioned.',
        code: 'SOCIAL_MEDIA_DECOMMISSIONED'
    });
};
router.use(decommissionedSocialHandler);
exports.default = router;
