import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../shared/auth.middleware';
import { AfricanMaritimeRegistry } from '../satellite/maritimeRegistry';

export interface SearchResultItem {
  type: 'users' | 'businesses' | 'services' | 'satellite_target' | 'people' | 'posts' | 'videos' | 'categories';
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
  {
    id: 'richards-bay-port',
    name: 'Port of Richards Bay & Coal Export Terminal',
    category: 'maritime',
    country: 'South Africa',
    description: 'Maritime SAR radar vessel density, bulk anchorage telemetry, and deepwater channel monitoring.',
    keywords: ['richards bay', 'port', 'maritime', 'vessel', 'coal', 'south africa', 'sar', 'radar', 'satellite'],
    bbox: '[32.00,-28.82,32.12,-28.74]',
    lat: -28.78,
    lon: 32.06,
  },
  {
    id: 'lekki-deep-sea-port',
    name: 'Lekki Deep Sea Port & Coastal Free Zone',
    category: 'maritime',
    country: 'Nigeria',
    description: 'Container ship berth telemetry, coastal breakwater stability, and vessel traffic surveillance.',
    keywords: ['lekki', 'port', 'lagos', 'nigeria', 'maritime', 'vessel', 'container', 'sar', 'satellite'],
    bbox: '[3.95,6.42,4.05,6.52]',
    lat: 6.44,
    lon: 4.00,
  },
  {
    id: 'tenke-fungurume-mine',
    name: 'Tenke Fungurume Copper-Cobalt Mining Concession',
    category: 'mining',
    country: 'Democratic Republic of Congo',
    description: 'Open pit extraction benches, haul road expansion, and tailings storage facility change detection.',
    keywords: ['tenke', 'fungurume', 'drc', 'congo', 'mining', 'copper', 'cobalt', 'sentinel', 'satellite'],
    bbox: '[26.15,-10.65,26.25,-10.55]',
    lat: -10.60,
    lon: 26.20,
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
    const wantsPeople = types.includes('people');
    const isUsers = isAll || types.includes('users') || types.includes('user') || types.includes('profiles') || types.includes('profile') || wantsPeople;
    const isServices = isAll || types.includes('services') || types.includes('service');
    const isPosts = isAll || types.includes('posts') || types.includes('post') || types.includes('content');
    const isVideos = isAll || types.includes('videos') || types.includes('video');
    const isCategories = isAll || types.includes('categories') || types.includes('category');

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

        // Include matching Continental African Maritime Ports & AOIs
        const matchingPorts = AfricanMaritimeRegistry.searchPorts({ query: q, limit: 10 });
        for (const port of matchingPorts) {
          if (!results.some(r => r.id === port.id || r.title.toLowerCase().includes(port.name.toLowerCase().slice(0, 10)))) {
            results.push({
              type: 'satellite_target',
              id: port.id,
              title: port.name,
              subtitle: `MARITIME • ${port.country}`,
              description: port.strategicSignificance,
              category: 'maritime',
              location: port.country,
              score: 92,
              metadata: {
                bbox: `[${port.bbox.join(',')}]`,
                centerLat: port.coordinates.lat,
                centerLon: port.coordinates.lon,
                harborType: port.harborType,
                region: port.region,
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

          // Also generate service result item if services were requested
          if (isServices) {
            results.push({
              type: 'services',
              id: `${b.id}-service`,
              title: `${b.businessName} - Professional ${b.category} Services`,
              subtitle: b.category,
              description: b.description || `Specialized ${b.category} operations and client solutions in ${b.location || 'region'}.`,
              category: b.category,
              location: b.location || undefined,
              isVerified: b.isVerified,
              score: 75,
              createdAt: b.createdAt,
            });
          }

          // Generate posts/content result item if posts were requested
          if (isPosts) {
            results.push({
              type: 'posts',
              id: `post-${b.id}`,
              title: `${b.businessName} Service Guide & Operational Notes`,
              subtitle: b.category,
              description: b.description || `Operational overview and service workflows for ${b.businessName}.`,
              category: b.category,
              location: b.location || undefined,
              score: 70,
              createdAt: b.createdAt,
            });
          }

          // Generate video result item if videos were requested
          if (isVideos) {
            results.push({
              type: 'videos',
              id: `video-${b.id}`,
              title: `${b.businessName} Technical Walkthrough & Demo Video`,
              subtitle: 'Demonstration Video',
              description: `Video walkthrough for ${b.category} inspections and operations.`,
              category: b.category,
              location: b.location || undefined,
              mediaUrl: 'https://cdn.afriqora.local/video-demo.mp4',
              score: 65,
              createdAt: b.createdAt,
            });
          }

          // Generate category item if categories were requested
          if (isCategories && b.category) {
            results.push({
              type: 'categories',
              id: `cat-${b.category.toLowerCase().replace(/\s+/g, '-')}`,
              title: b.category,
              subtitle: 'Enterprise Industry Category',
              category: b.category,
              score: 60,
              createdAt: b.createdAt,
            });
          }
        }
      }

      // 3. User Accounts & Professional Profiles
      if (isUsers) {
        const isOperatorQuery = q.toLowerCase().includes('operator') || q.toLowerCase().includes('owner') || q.toLowerCase().includes('admin');
        const users = await prisma.user.findMany({
          where: q && q !== 'users' && q !== 'profiles' && q !== 'all' && q !== 'people' ? {
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
            type: wantsPeople ? 'people' : 'users',
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
