"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const feed_routes_1 = __importDefault(require("./modules/feed/feed.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const messaging_routes_1 = __importDefault(require("./modules/messaging/messaging.routes"));
const creator_routes_1 = __importDefault(require("./modules/creator/creator.routes"));
const monetization_routes_1 = __importDefault(require("./modules/monetization/monetization.routes"));
const connect_routes_1 = __importDefault(require("./modules/connect/connect.routes"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});
// Legacy fallback routes will be added later
app.use('/api/auth', auth_routes_1.default);
app.use('/api/feed', feed_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/messages', messaging_routes_1.default);
app.use('/api/creator', creator_routes_1.default);
app.use('/api/monetization', monetization_routes_1.default);
app.use('/api/connect', connect_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), source: 'ts-backend' });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), source: 'ts-backend' });
});
app.listen(port, () => {
    console.log(`AFRIQORA Backend (Node.js) listening on port ${port}`);
});
