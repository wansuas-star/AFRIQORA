import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../shared/auth.middleware';

export interface SearchResultItem {
  type: 'users' | 'businesses' | 'services' | 'satellite_target';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  avatarUrl?: string;
  mediaUrl?: string;
  category?: string;
  location?: string;
  price?: number;
  isVerified?: boolean;
  score?: number;
  createdAt?: Date;
  metadata?: Record<string, any>;
}

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const typeParam = ((req.query.type as string) || 'all').toLowerCase();
    const category = ((req.query.category as string) || '').toLowerCase();
    const location = ((req.query.location as string) || '').toLowerCase();
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

    const types = typeParam.split(',').map(t => t.trim());
    const results: SearchResultItem[] = [];

    try {
      // 1. Satellite Observation Targets
      if (types.includes('satellite') || types.includes('targets') || types.includes('aoi') || types.includes('all')) {
        const targets = await prisma.satelliteTarget.findMany({
          where: q ? {
            OR: [
              { name: { contains: q } },
              { category: { contains: q } },
              { country: { contains: q } },
              { description: { contains: q } },
            ],
          } : {},
          take: limit,
        });

        for (const t of targets) {
          results.push({
            type: 'satellite_target',
            id: t.id,
            title: t.name,
            subtitle: `${t.category.toUpperCase()} • ${t.country}`,
            description: t.description || undefined,
            category: t.category,
            location: t.country,
            score: 100,
            createdAt: t.createdAt,
            metadata: {
              bbox: t.bbox,
              centerLat: t.centerLat,
              centerLon: t.centerLon,
            },
          });
        }
      }

      // 2. Verified Businesses & Enterprises
      if (types.includes('businesses') || types.includes('all')) {
        const businesses = await prisma.businessProfile.findMany({
          where: {
            ...(q ? {
              OR: [
                { businessName: { contains: q } },
                { category: { contains: q } },
                { description: { contains: q } },
                { location: { contains: q } },
              ],
            } : {}),
            ...(category ? { category: { contains: category } } : {}),
            ...(location ? { location: { contains: location } } : {}),
          },
          take: limit,
        });

        for (const b of businesses) {
          results.push({
            type: 'businesses',
            id: b.id,
            title: b.businessName,
            subtitle: b.category,
            description: b.description || undefined,
            avatarUrl: b.logo || undefined,
            category: b.category,
            location: b.location || undefined,
            isVerified: b.isVerified,
            score: b.isVerified ? 80 : 40,
            createdAt: b.createdAt,
          });
        }
      }

      // 3. User Accounts
      if (types.includes('users') || types.includes('all')) {
        const users = await prisma.user.findMany({
          where: q ? {
            OR: [
              { displayName: { contains: q } },
              { email: { contains: q } },
              { username: { contains: q } },
              { location: { contains: q } },
            ],
          } : {},
          take: limit,
          select: {
            id: true,
            displayName: true,
            username: true,
            email: true,
            profilePhoto: true,
            location: true,
            createdAt: true,
          },
        });

        for (const u of users) {
          results.push({
            type: 'users',
            id: u.id,
            title: u.displayName,
            subtitle: u.username ? `@${u.username}` : u.email,
            avatarUrl: u.profilePhoto || undefined,
            location: u.location || undefined,
            score: 20,
            createdAt: u.createdAt,
          });
        }
      }

      // Sort by score descending
      results.sort((a, b) => (b.score || 0) - (a.score || 0));

      res.json({
        ok: true,
        count: results.length,
        items: results.slice(0, limit),
      });
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({ error: { message: err.message || 'Search execution failed' } });
    }
  }
}
