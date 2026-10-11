import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import monetizationRoutes from './modules/monetization/monetization.routes';
import connectRoutes from './modules/connect/connect.routes';
import searchRoutes from './modules/search/search.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import commercialRoutes from './modules/commercial/commercial.routes';
import adminRoutes from './modules/admin/admin.routes';
import satelliteRoutes from './modules/satellite/satellite.routes';
import governmentRoutes from './modules/government/government.routes';

// Decommissioned Social Media Routers
import feedRoutes from './modules/feed/feed.routes';
import creatorRoutes from './modules/creator/creator.routes';
import messagingRoutes from './modules/messaging/messaging.routes';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.url.startsWith('/assets') && !req.url.endsWith('.ico') && !req.url.endsWith('.png')) {
    console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url);
  }
  next();
});

// Flagship Satellite Earth Observation Intelligence API (ML-01 Foundation)
app.use('/api/satellite', satelliteRoutes);

// Government Investigative Intelligence & Universal Integration API
app.use('/api/gov', governmentRoutes);

// Core Enterprise, Identity & Commercial API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monetization', monetizationRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);

// Decommissioned Social Media Endpoints (HTTP 410 Gone)
const decommissionedSocialHandler = (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media functionality has been permanently decommissioned.',
    code: 'SOCIAL_MEDIA_DECOMMISSIONED'
  });
};

app.use('/api/feed', feedRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/interactions', decommissionedSocialHandler);
app.use('/api/comments', decommissionedSocialHandler);
app.use('/api/social', decommissionedSocialHandler);

// Health checks
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'staging',
    timestamp: new Date().toISOString(),
    platform: 'AFRIQORA Satellite Intelligence & Space Technologies (ML-01)',
    version: '2.0.0-staging'
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    now: Date.now(),
    environment: process.env.NODE_ENV || 'staging',
    platform: 'AFRIQORA Satellite Intelligence & Space Technologies (ML-01)'
  });
});

// Serve frontend production build if available
const frontendDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../../../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), '../frontend/dist')
];

let frontendDist = '';
for (const p of frontendDistPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    frontendDist = p;
    break;
  }
}

if (frontendDist) {
  console.log('Serving frontend staging build from: ' + frontendDist);
  app.use(express.static(frontendDist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: { message: err.message || 'Internal Server Error' },
  });
});

app.listen(port, () => {
  console.log('======================================================================');
  console.log('AFRIQORA Satellite Intelligence & Space Technologies Staging Online');
  console.log('URL: http://localhost:' + port);
  console.log('Health Check: http://localhost:' + port + '/api/health');
  console.log('Satellite API: http://localhost:' + port + '/api/satellite/status');
  console.log('======================================================================');
});

export default app;
