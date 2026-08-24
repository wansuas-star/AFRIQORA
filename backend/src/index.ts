import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

import authRoutes from './modules/auth/auth.routes';
import feedRoutes from './modules/feed/feed.routes';
import usersRoutes from './modules/users/users.routes';
import messagingRoutes from './modules/messaging/messaging.routes';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`AFRIQORA Backend (Node.js) listening on port ${port}`);
});
