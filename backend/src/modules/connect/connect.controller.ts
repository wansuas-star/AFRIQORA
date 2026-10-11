import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import prisma from '../../config/prisma';

// Enterprise OIDC and verified identity providers only (Social-media connectors removed)
const CONNECT_PERMISSIONS: Record<string, string[]> = {
  google: ['profile', 'email'],
  enterprise_oidc: ['identity', 'email', 'organization'],
};

// GET /api/connect/permissions
export const getPermissions = (_req: Request, res: Response) => {
  res.json({ permissions: CONNECT_PERMISSIONS });
};

// GET /api/connect/services?userId=<id>
export const getConnectedServices = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const connections = await prisma.serviceConnection.findMany({
      where: { userId },
      select: { serviceName: true, permissions: true, createdAt: true },
    });

    res.json({ connections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/connect
export const connectService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { serviceName, permissions } = req.body;
    const userId = req.userId!;

    if (!serviceName || !CONNECT_PERMISSIONS[serviceName]) {
      return res.status(400).json({ error: 'Unknown or unsupported service: ' + serviceName + '. Social media connections are decommissioned.' });
    }

    const serializedPermissions = Array.isArray(permissions)
      ? permissions.join(',')
      : (permissions ?? CONNECT_PERMISSIONS[serviceName].join(','));

    const connection = await prisma.serviceConnection.upsert({
      where: { userId_serviceName: { userId, serviceName } },
      update: { permissions: serializedPermissions },
      create: { userId, serviceName, permissions: serializedPermissions },
    });

    res.json({ connection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/connect/:service
export const disconnectService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawService = req.params['service'];
    const serviceParam = Array.isArray(rawService) ? rawService[0] : rawService;
    const userId = req.userId!;

    await prisma.serviceConnection.deleteMany({
      where: { userId, serviceName: serviceParam },
    });

    res.json({ success: true, message: 'Disconnected from ' + serviceParam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
