"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComments = exports.addComment = exports.unlikePost = exports.likePost = exports.deletePost = exports.updatePost = exports.getPublicFeed = exports.getMyFeed = exports.getHomeFeed = exports.createPost = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const createPost = async (req, res) => {
    try {
        const { title, text, video, image, type, category, location, website, contact, businessId } = req.body;
        if (!text && !video && !image) {
            return res.status(400).json({ error: 'Post must contain text, video, or image' });
        }
        const post = await prisma_1.default.post.create({
            data: {
                title,
                text,
                video,
                image,
                type: type || 'text',
                category,
                location,
                website,
                contact,
                businessId,
                authorId: req.userId,
            }
        });
        res.status(201).json({ post });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createPost = createPost;
const getHomeFeed = async (req, res) => {
    try {
        const posts = await prisma_1.default.post.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                author: {
                    select: { id: true, displayName: true, profilePhoto: true, afriqoraId: true }
                },
                business: {
                    select: { id: true, businessName: true, logo: true }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });
        res.json({ posts });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getHomeFeed = getHomeFeed;
const getMyFeed = async (req, res) => {
    try {
        const posts = await prisma_1.default.post.findMany({
            where: { authorId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json({ posts });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyFeed = getMyFeed;
const getPublicFeed = async (req, res) => {
    try {
        const posts = await prisma_1.default.post.findMany({
            where: { status: 'published' },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                author: { select: { id: true, displayName: true, profilePhoto: true, afriqoraId: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json({ posts });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPublicFeed = getPublicFeed;
const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, text, video, image, type, category, location, website, contact, status } = req.body;
        const existingPost = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!existingPost)
            return res.status(404).json({ error: 'Post not found' });
        if (existingPost.authorId !== req.userId)
            return res.status(403).json({ error: 'Unauthorized' });
        const post = await prisma_1.default.post.update({
            where: { id: postId },
            data: {
                title, text, video, image, type, category, location, website, contact, status,
                updatedAt: new Date()
            }
        });
        res.json({ post });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updatePost = updatePost;
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const existingPost = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!existingPost)
            return res.status(404).json({ error: 'Post not found' });
        if (existingPost.authorId !== req.userId)
            return res.status(403).json({ error: 'Unauthorized' });
        // Delete related
        await prisma_1.default.like.deleteMany({ where: { postId } });
        await prisma_1.default.comment.deleteMany({ where: { postId } });
        await prisma_1.default.post.delete({ where: { id: postId } });
        res.json({ status: 'deleted' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deletePost = deletePost;
const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const existingPost = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!existingPost)
            return res.status(404).json({ error: 'Post not found' });
        try {
            await prisma_1.default.like.create({
                data: { userId: req.userId, postId }
            });
        }
        catch (e) {
            // Ignore if already liked (unique constraint)
        }
        const likesCount = await prisma_1.default.like.count({ where: { postId } });
        res.json({ ok: true, liked: true, likesCount });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.likePost = likePost;
const unlikePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const existingPost = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!existingPost)
            return res.status(404).json({ error: 'Post not found' });
        await prisma_1.default.like.deleteMany({
            where: { userId: req.userId, postId }
        });
        const likesCount = await prisma_1.default.like.count({ where: { postId } });
        res.json({ ok: true, liked: false, likesCount });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.unlikePost = unlikePost;
const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const { text } = req.body;
        if (!text)
            return res.status(400).json({ error: 'text is required' });
        const existingPost = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!existingPost)
            return res.status(404).json({ error: 'Post not found' });
        const comment = await prisma_1.default.comment.create({
            data: { userId: req.userId, postId, text }
        });
        res.json({ ok: true, comment });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addComment = addComment;
const getComments = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await prisma_1.default.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, displayName: true, profilePhoto: true, afriqoraId: true }
                }
            }
        });
        res.json({ ok: true, comments });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getComments = getComments;
