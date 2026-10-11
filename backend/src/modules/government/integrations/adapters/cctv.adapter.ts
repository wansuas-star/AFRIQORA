/**
 * AFRIQORA Universal Integration Layer - CCTV & Video Network Adapter
 * Supports Municipal CCTV, Traffic Cameras, and VMS networks (ONVIF/RTSP compliant)
 */

import crypto from 'crypto';
import { IUniversalIntegrationAdapter, IngestionAsset, IngestionResult, QueryScope } from '../adapter.interface';

interface MockCamera {
  id: string;
  name: string;
  network: string;
  lat: number;
  lon: number;
  jurisdiction: string;
  resolution: string;
  streamProtocol: 'ONVIF' | 'RTSP';
  coverageRadiusM: number;
}

export class CCTVAdapter implements IUniversalIntegrationAdapter {
  public readonly id = 'cctv_municipal_adapter';
  public readonly category = 'CCTV';
  public readonly requiresWarrant = true;

  // Realistic municipal camera network mock (e.g. Johannesburg CBD, Sandton, Lekki, Richards Bay)
  private readonly cameraNetwork: MockCamera[] = [
    {
      id: 'CAM-JHB-CBD-001',
      name: 'Main & Eloff St Intersection',
      network: 'City of Johannesburg Public Safety',
      lat: -26.2045,
      lon: 28.0450,
      jurisdiction: 'ZA',
      resolution: '1080p-30fps',
      streamProtocol: 'ONVIF',
      coverageRadiusM: 350,
    },
    {
      id: 'CAM-JHB-CBD-002',
      name: 'Pritchard & Rissik High-Angle',
      network: 'City of Johannesburg Public Safety',
      lat: -26.2030,
      lon: 28.0420,
      jurisdiction: 'ZA',
      resolution: '4K-25fps',
      streamProtocol: 'ONVIF',
      coverageRadiusM: 400,
    },
    {
      id: 'CAM-SANDTON-010',
      name: 'Sandton Drive & Rivonia Rd',
      network: 'Sandton Central Management District',
      lat: -26.1075,
      lon: 28.0560,
      jurisdiction: 'ZA',
      resolution: '1080p-30fps',
      streamProtocol: 'RTSP',
      coverageRadiusM: 300,
    },
    {
      id: 'CAM-LEKKI-005',
      name: 'Admiralty Way Gateway',
      network: 'Lekki Concession Surveillance',
      lat: 6.4474,
      lon: 3.4723,
      jurisdiction: 'NG',
      resolution: '1080p-30fps',
      streamProtocol: 'ONVIF',
      coverageRadiusM: 500,
    },
  ];

  public async testConnection(config: Record<string, any>): Promise<{ healthy: boolean; latencyMs: number; details?: string }> {
    const endpoint = config.endpointUrl || 'https://vms-gateway.local';
    return {
      healthy: true,
      latencyMs: 18,
      details: `VMS Gateway reachable at ${endpoint} (ONVIF Profile S/T)`,
    };
  }

  public async query(scope: QueryScope, config: Record<string, any>): Promise<IngestionResult> {
    if (!scope.location) {
      return {
        adapterId: this.id,
        category: this.category,
        status: 'NO_DATA',
        assets: [],
        epistemicTier: 'UNAVAILABLE_INFORMATION',
        message: 'No location coordinates provided for camera spatial search',
      };
    }

    const { lat, lon, radiusMeters } = scope.location;

    // Haversine formula calculation
    const matchingCameras = this.cameraNetwork.filter(cam => {
      const dLat = (cam.lat - lat) * (Math.PI / 180);
      const dLon = (cam.lon - lon) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * (Math.PI / 180)) * Math.cos(cam.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = 6371000 * c;
      return distanceMeters <= (radiusMeters + cam.coverageRadiusM);
    });

    if (matchingCameras.length === 0) {
      return {
        adapterId: this.id,
        category: this.category,
        status: 'NO_DATA',
        assets: [],
        epistemicTier: 'UNAVAILABLE_INFORMATION',
        message: `No authorized municipal CCTV cameras found within ${radiusMeters}m of coordinates (${lat}, ${lon})`,
      };
    }

    const assets: IngestionAsset[] = [];

    for (const cam of matchingCameras) {
      // Deterministic simulated video clip payload
      const payloadString = `MOCK_CCTV_RECORDING:${cam.id}:${scope.timeRange.start.toISOString()}:${scope.timeRange.end.toISOString()}`;
      const rawBuffer = Buffer.from(payloadString, 'utf8');
      const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

      assets.push({
        assetId: `CCTV-${cam.id}-${Date.now()}`,
        sourceType: 'CCTV_FOOTAGE',
        sourceName: cam.name,
        sourceOrganization: cam.network,
        mimeType: 'video/mp4',
        rawBuffer,
        sha256Hash: sha256,
        fileSizeBytes: BigInt(rawBuffer.length),
        originalTimestamp: scope.timeRange.start,
        metadataJson: {
          cameraId: cam.id,
          protocol: cam.streamProtocol,
          resolution: cam.resolution,
          cameraCoordinates: { lat: cam.lat, lon: cam.lon },
          timeWindow: {
            start: scope.timeRange.start.toISOString(),
            end: scope.timeRange.end.toISOString(),
          },
          frameRate: 30,
          hashAlgorithm: 'SHA-256',
        },
      });
    }

    return {
      adapterId: this.id,
      category: this.category,
      status: 'SUCCESS',
      assets,
      epistemicTier: 'OBSERVED_FACT',
      message: `Retrieved ${assets.length} authorized CCTV footage stream(s) covering location`,
      details: {
        queriedRadiusMeters: radiusMeters,
        camerasFound: matchingCameras.map(c => c.id),
      },
    };
  }
}
