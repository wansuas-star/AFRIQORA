export type SourceReliabilityRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type InformationCredibilityRating = '1' | '2' | '3' | '4' | '5' | '6';

export interface AdmiraltyGrading {
  sourceReliability: SourceReliabilityRating; // A = Completely reliable, B = Usually reliable, C = Fairly reliable
  informationCredibility: InformationCredibilityRating; // 1 = Confirmed by other sources, 2 = Probably true, 3 = Possibly true
  compositeScore: string; // e.g., "A1", "B2"
  confidencePercent: number; // 0 - 100%
  assessmentNotes: string;
}

export type ConflictIncidentType =
  | 'MINING_SITE_INTERFERENCE'
  | 'TRANSPORT_CORRIDOR_CHOKEPOINT'
  | 'ARMED_GROUP_CLASH'
  | 'CIVILIAN_DISPLACEMENT_TRIGGER'
  | 'NATURAL_RESOURCE_EXPLOITATION'
  | 'BORDER_CORRIDOR_SURVEILLANCE';

export interface ConflictIncidentSource {
  sourceName: string;
  sourceType: 'UN_MONUSCO' | 'REGIONAL_MONITORING_TRACKER' | 'LOCAL_CIVIL_SOCIETY' | 'GOVERNMENT_DISPATCH' | 'COMMERCIAL_SUPPLY_CHAIN_AUDIT';
  reportingDate: string;
  verifiableDocumentRef?: string;
  admiraltyGrading: AdmiraltyGrading;
}

export interface SatelliteObservationLink {
  observationId: string;
  platform: 'Sentinel-1A SAR' | 'Sentinel-2A MSI' | 'Sentinel-2B MSI' | 'FUSED_SENTINEL1_SENTINEL2';
  observationDate: string;
  deltaIndexType: 'RADAR_BACKSCATTER_DB' | 'NDVI_VEGETATION_LOSS' | 'MNDWI_WATER_ALTERATION' | 'SWIR_SURFACE_DISTURBANCE' | 'NDBI_BUILTUP_EXPANSION';
  deltaMagnitude: number;
  areaHectares: number;
  corroborationStatus: 'PHYSICALLY_CORROBORATED' | 'CONSISTENT_WITH_REPORTS' | 'UNVERIFIABLE_CLOUD_COVER';
  integrityHashSha256: string;
  isRealData?: boolean;
  dataSource?: 'COPERNICUS_CDSE_LIVE_DOWNLOAD' | 'COPERNICUS_ODATA_CATALOGUE' | 'CALIBRATED_BENCHMARK_GRID';
  metrics?: Record<string, any>;
  notes?: string;
}

export interface ConflictIncident {
  id: string;
  title: string;
  country: string;
  province: string;
  territory?: string;
  locationName: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  bbox: [number, number, number, number];
  incidentDate: string;
  incidentType: ConflictIncidentType;
  severityLevel: 'CRITICAL' | 'ELEVATED' | 'MONITORING';
  summary: string;
  strategicContext: string;
  mineralOrResourceImpact?: string;
  reportedPartiesInvolved: string[];
  sources: ConflictIncidentSource[];
  satelliteObservations: SatelliteObservationLink[];
  auditProvenanceSha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictModuleState {
  isActive: boolean;
  activationDate?: string;
  authorizedByOwnerEmail?: string;
  authorizationNonce?: string;
  surveillanceNotice: string;
  strictOwnerGateEnabled: boolean;
}

export interface ConflictAuditEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  targetIncidentId?: string;
  details: string;
  sha256Signature: string;
}
