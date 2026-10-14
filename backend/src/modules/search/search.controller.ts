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
  isSponsored?: boolean;
  campaignId?: string;
  score?: number;
  createdAt?: Date;
  metadata?: Record<string, any>;
}

// Canonical African Earth Observation & Space Intelligence Hotspots
const CANONICAL_HOTSPOTS = [
  {
    id: 'gerd-reservoir',
    name: 'Grand Ethiopian Renaissance Dam (GERD)',
    category: 'hydrology',
    country: 'Ethiopia',
    description: 'Reservoir filling telemetry, Blue Nile water retention, and dam wall structural monitoring.',
    keywords: ['gerd', 'dam', 'ethiopia', 'water', 'reservoir', 'hydrology', 'nile', 'satellite', 'sentinel'],
    bbox: '[35.05,11.18,35.15,11.26]',
    lat: 11.215,
    lon: 35.093,
  },
  {
    id: 'lake-chad-basin',
    name: 'Lake Chad Basin Southern Pool',
    category: 'environmental',
    country: 'Chad / Cameroon / Nigeria',
    description: 'Receding shoreline observation, wetland marsh dynamics, and drought risk telemetry.',
    keywords: ['lake chad', 'chad', 'nigeria', 'sahel', 'wetland', 'drought', 'water', 'satellite', 'sentinel'],
    bbox: '[14.40,12.85,14.60,13.05]',
    lat: 13.0,
    lon: 14.5,
  },
  {
    id: 'suez-maritime-corridor',
    name: 'Suez Canal & Bitter Lakes Transit Corridor',
    category: 'maritime',
    country: 'Egypt',
    description: 'Maritime choke point vessel density, anchorage telemetry, and radar SAR vessel detection.',
    keywords: ['suez', 'canal', 'egypt', 'maritime', 'vessel', 'port', 'radar', 'sar', 'satellite'],
    bbox: '[32.20,30.50,32.35,30.65]',
    lat: 30.585,
    lon: 32.265,
  },
  {
    id: 'niger-delta-mangroves',
    name: 'Niger Delta Coastal & Wetland Mangroves',
    category: 'environmental',
    country: 'Nigeria',
    description: 'Coastal accretion, hydrocarbon slick radar monitoring, and mangrove conservation.',
    keywords: ['niger delta', 'delta', 'nigeria', 'mangrove', 'slick', 'oil', 'radar', 'satellite'],
    bbox: '[5.80,4.60,6.20,5.00]',
    lat: 4.75,
    lon: 6.0,
  },
];

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const typeParam = ((req.query.type as string) || (req.query.types as string) || 'all').toLowerCase();
    const category = ((req.query.category as string) || '').toLowerCase();
    const location = ((req.query.location as string) || '').toLowerCase();
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

    const types = typeParam.split(',').map(t => t.trim());
    const isAll = types.includes('all');
    const isSatellite = isAll || types.includes('satellite') || types.includes('targets') || types.includes('aoi') || types.includes('satellite_target') || types.includes('earth-observation');
    const isBusinesses = isAll || types.includes('businesses') || types.includes('business') || types.includes('enterprise');
    const isUsers = isAll || types.includes('users') || types.includes('user') || types.includes('profiles') || types.includes('profile');

    const results: SearchResultItem[] = [];

    try {
      // 1. Satellite Observation Targets & African Space Hotspots
      if (isSatellite) {
        // Query Database Targets
        const targets = await prisma.satelliteTarget.findMany({
          where: q && q !== 'satellite' && q !== 'all' ? {
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

        // Include matching Canonical African Hotspots
        for (const spot of CANONICAL_HOTSPOTS) {
          const matches = !q || q === 'satellite' || q === 'all' ||
            spot.name.toLowerCase().includes(q) ||
            spot.country.toLowerCase().includes(q) ||
            spot.category.toLowerCase().includes(q) ||
            spot.keywords.some(k => k.includes(q) || q.includes(k));

          if (matches && !results.some(r => r.title.toLowerCase().includes(spot.name.toLowerCase().slice(0, 10)))) {
            results.push({
              type: 'satellite_target',
              id: spot.id,
              title: spot.name,
              subtitle: `${spot.category.toUpperCase()} • ${spot.country}`,
              description: spot.description,
              category: spot.category,
              location: spot.country,
              score: 95,
              metadata: {
                bbox: spot.bbox,
                centerLat: spot.lat,
                centerLon: spot.lon,
              },
            });
          }
        }
      }

      // 2. Verified Businesses & Enterprises
      if (isBusinesses) {
        const businesses = await prisma.businessProfile.findMany({
          where: {
            ...(q && q !== 'businesses' && q !== 'all' ? {
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
          include: {
            campaigns: {
              where: { status: 'active' },
              take: 1,
            },
          },
          orderBy: [
            { isVerified: 'desc' },
            { createdAt: 'desc' },
          ],
          take: limit,
        });

        for (const b of businesses) {
          const activeCampaign = b.campaigns && b.campaigns.length > 0 ? b.campaigns[0] : null;
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
            isSponsored: !!activeCampaign,
            campaignId: activeCampaign?.id,
            score: (activeCampaign ? 120 : 0) + (b.isVerified ? 80 : 40),
            createdAt: b.createdAt,
          });
        }
      }

      // 3. User Accounts & Professional Profiles
      if (isUsers) {
        const isOperatorQuery = q.toLowerCase().includes('operator') || q.toLowerCase().includes('owner') || q.toLowerCase().includes('admin');
        const users = await prisma.user.findMany({
          where: q && q !== 'users' && q !== 'profiles' && q !== 'all' ? {
            OR: [
              { displayName: { contains: q } },
              { email: { contains: q } },
              { username: { contains: q } },
              { bio: { contains: q } },
              { location: { contains: q } },
              { afriqoraId: { contains: q } },
              ...(isOperatorQuery ? [{ isPlatformOwner: true }] : []),
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
            isPlatformOwner: true,
          },
        });

        for (const u of users) {
          results.push({
            type: 'users',
            id: u.id,
            title: u.displayName,
            subtitle: u.isPlatformOwner ? 'Platform Owner' : (u.username ? `@${u.username}` : u.email),
            avatarUrl: u.profilePhoto || undefined,
            location: u.location || undefined,
            score: u.isPlatformOwner ? 90 : 20,
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
