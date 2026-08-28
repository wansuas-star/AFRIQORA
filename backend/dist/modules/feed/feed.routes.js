"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feed_controller_1 = require("./feed.controller");
const auth_middleware_1 = require("../../shared/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/public', feed_controller_1.getPublicFeed);
router.use(auth_middleware_1.requireAuth);
router.post('/', feed_controller_1.createPost);
router.get('/home', feed_controller_1.getHomeFeed);
router.get('/mine', feed_controller_1.getMyFeed);
router.put('/:id', feed_controller_1.updatePost);
router.delete('/:id', feed_controller_1.deletePost);
router.post('/:id/like', feed_controller_1.likePost);
router.post('/:id/unlike', feed_controller_1.unlikePost);
router.post('/:id/comment', feed_controller_1.addComment);
router.get('/:id/comments', feed_controller_1.getComments);
exports.default = router;
