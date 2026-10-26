"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const auth_middleware_1 = require("../../shared/auth.middleware");
const register = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password || !displayName) {
            return res.status(400).json({ error: 'Email, password, and displayName are required' });
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const afriqoraId = 'AFR' + Math.floor(10000000 + Math.random() * 90000000);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                passwordHash,
                displayName,
                afriqoraId,
            }
        });
        const jwtSecret = (0, auth_middleware_1.getJwtSecret)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, afriqoraId: user.afriqoraId } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const jwtSecret = (0, auth_middleware_1.getJwtSecret)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, afriqoraId: user.afriqoraId } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
