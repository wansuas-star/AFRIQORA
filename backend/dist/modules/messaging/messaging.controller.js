"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.sendMessage = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        if (!receiverId || !content) {
            return res.status(400).json({ error: 'receiverId and content are required' });
        }
        const message = await prisma_1.default.message.create({
            data: {
                senderId: req.userId,
                receiverId,
                content
            }
        });
        res.status(201).json({ message });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res) => {
    try {
        const peerId = req.params.peerId;
        const messages = await prisma_1.default.message.findMany({
            where: {
                OR: [
                    { senderId: req.userId, receiverId: peerId },
                    { senderId: peerId, receiverId: req.userId }
                ]
            },
            orderBy: { createdAt: 'asc' },
            take: 50
        });
        res.json({ messages });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMessages = getMessages;
