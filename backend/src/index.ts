import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

import authRoutes from './modules/auth/auth.routes';
import feedRoutes from './modules/feed/feed.routes';
import usersRoutes from './modules/users/users.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import creatorRoutes from './modules/creator/creator.routes';
import monetizationRoutes from './modules/monetization/monetization.routes';
import connectRoutes from './modules/connect/connect.routes';

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(req.method, req.url);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/monetization', monetizationRoutes);
app.use('/api/connect', connectRoutes);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), source: 'ts-backend' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: { message: err.message || 'Internal Server Error' },
  });
});

app.listen(port, () => {
  console.log(`AFRIQORA TS Backend listening on port ${port}`);
});
