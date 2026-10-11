/**
 * AFRIQORA Universal Integration Layer
 * Standardized Adapter Interface & Query Scope Definitions
 */

import { IntegrationCategory, EpistemicInvestigationDossier } from '../types';

export interface QueryScope {
  caseId: string;
  agencyId: string;
  officerId: string;
  legalMandateRef?: string;
  isEmergency?: boolean;
  emergencyReason?: string;
  location?: {
    lat: number;
    lon: number;
    radiusMeters: number;
    suburbOrCity?: string;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
  targetIdentifiers?: string[]; // Plates, IMEIs, IMSIs, File Hashes, Names
}

export interface IngestionAsset {
  assetId: string;
  sourceType: string;
  sourceName: string;
  sourceOrganization: string;
  mimeType: string;
  rawBuffer: Buffer;
  sha256Hash: string;
  blake3Hash?: string;
  fileSizeBytes: bigint;
  originalTimestamp?: Date;
  metadataJson: Record<string, any>;
}

export interface IngestionResult {
  adapterId: string;
  category: IntegrationCategory;
  status: 'SUCCESS' | 'NO_DATA' | 'ACCESS_DENIED' | 'ERROR';
  assets: IngestionAsset[];
  epistemicTier: 'OBSERVED_FACT' | 'UNAVAILABLE_INFORMATION' | 'UNCERTAINTY';
  message: string;
  details?: Record<string, any>;
}

export interface IUniversalIntegrationAdapter {
  readonly id: string;
  readonly category: IntegrationCategory;
  readonly requiresWarrant: boolean;

  testConnection(config: Record<string, any>): Promise<{
    healthy: boolean;
    latencyMs: number;
    details?: string;
  }>;

  query(scope: QueryScope, config: Record<string, any>): Promise<IngestionResult>;
}
