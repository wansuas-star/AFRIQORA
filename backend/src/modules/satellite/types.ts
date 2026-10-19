export type GeoBoundingBox = [minLon: number, minLat: number, maxLon: number, maxLat: number];

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoFeature {
  type: 'Feature';
  geometry: GeoPolygon;
  properties: {
    id?: string;
    changeType: 'EXPANSION' | 'VEGETATION_LOSS' | 'STRUCTURAL_CHANGE' | 'VESSEL_CLUSTER' | 'GENERAL_ANOMALY';
    areaHectares: number;
    areaSquareKm: number;
    meanDeltaValue: number;
    confidence: number;
    description: string;
  };
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export type SatelliteProviderName = 'copernicus_cdse' | 'aws_stac' | 'planet_commercial' | 'modular_adapter';
export type SatellitePlatform = 'Sentinel-1A' | 'Sentinel-1B' | 'Sentinel-2A' | 'Sentinel-2B' | 'Commercial-HR';
export type SensorType = 'SAR_C_BAND' | 'OPTICAL_MSI' | 'OPTICAL_VERY_HIGH_RES';
export type AnalysisIntent = 'mining_expansion' | 'vegetation_loss' | 'port_vessel_activity' | 'urban_construction' | 'general_change' | 'object_detection' | 'image_understanding' | 'stability_check';

export interface RawSceneMetadata {
  id: string;
  provider: SatelliteProviderName;
  platform: SatellitePlatform;
  sensorType: SensorType;
  acquisitionDate: Date;
  cloudCover?: number;
  polarization?: string;
  orbitDirection?: 'ASCENDING' | 'DESCENDING';
  resolutionMeters: number;
  availableBands: string[];
  bbox: GeoBoundingBox;
  thumbnailUrl?: string;
  tileUrl?: string;
  metadata?: Record<string, any>;
}

export interface RasterGrid {
  width: number;
  height: number;
  bbox: GeoBoundingBox;
  resolutionMeters: number;
  data: number[][]; // [row][col]
}

export interface SARScenePayload {
  sceneId: string;
  acquisitionDate: Date;
  polarization: string;
  resolutionMeters: number;
  vvGridDb: RasterGrid;
  vhGridDb: RasterGrid;
  crossPolarizationRatioDb?: RasterGrid;
  isRealData?: boolean;
  dataSource?: 'COPERNICUS_CDSE_LIVE_DOWNLOAD' | 'COPERNICUS_ODATA_CATALOGUE' | 'COPERNICUS_CDSE' | 'CALIBRATED_BENCHMARK_GRID';
}

export interface OpticalScenePayload {
  sceneId: string;
  acquisitionDate: Date;
  cloudCover: number;
  resolutionMeters: number;
  redGrid: RasterGrid;
  greenGrid: RasterGrid;
  blueGrid: RasterGrid;
  nirGrid: RasterGrid;
  swirGrid: RasterGrid;
  sclGrid: RasterGrid; // Scene Classification Layer
  ndviGrid: RasterGrid;
  ndbiGrid: RasterGrid;
  mndwiGrid: RasterGrid;
  eviGrid?: RasterGrid;
  saviGrid?: RasterGrid;
  isRealData?: boolean;
  dataSource?: 'COPERNICUS_CDSE_LIVE_DOWNLOAD' | 'COPERNICUS_ODATA_CATALOGUE' | 'COPERNICUS_CDSE' | 'CALIBRATED_BENCHMARK_GRID';
}

export type ObjectClass = 
  | 'BUILDING_STRUCTURE'
  | 'INDUSTRIAL_FACILITY'
  | 'HEAVY_TRUCK_FLEET'
  | 'MARITIME_VESSEL'
  | 'ROAD_INFRASTRUCTURE'
  | 'WATER_RESERVOIR'
  | 'VEGETATION_CANOPY'
  | 'AGGREGATE_HUMAN_ACTIVITY'
  | 'UNRESOLVABLE_SUBPIXEL';

export interface DetectedObject {
  id: string;
  objectClass: ObjectClass;
  label: string;
  confidence: number;
  bbox: GeoBoundingBox;
  areaSquareMeters: number;
  pixelCount: number;
  radarBackscatterDb?: number;
  opticalNdvi?: number;
  isSubpixel: boolean;
  classificationCertainty: 'CERTAIN' | 'PROBABLE' | 'UNRESOLVABLE_AT_10M';
  sourceSceneId: string;
  acquisitionDate: string;
  sensorPlatform: string;
  pixelResolution: string;
  detectionMethod: string;
  isRealObservation: boolean;
  validationStatus: 'ALGORITHMICALLY_VERIFIED_SENTINEL' | 'UNVERIFIED_BENCHMARK_DATA' | 'UNRESOLVABLE_AT_CURRENT_GSD';
  validationRequirements?: string;
  technicalLimitationNotice?: string;
  description: string;
  vesselMetrics?: VesselPhysicalMetrics;
  groundTruthVerification?: GroundTruthVerificationRecord;
}

export interface LandCoverBreakdown {
  vegetationPercent: number;
  builtStructurePercent: number;
  bareSoilPercent: number;
  waterSurfacePercent: number;
  cloudShadowPercent: number;
}

export interface ImageUnderstandingResult {
  locationName: string;
  bbox: GeoBoundingBox;
  acquisitionDate: string;
  sensorPlatform: string;
  sensorResolutionSummary: {
    sentinel2Optical: string;
    sentinel1SAR: string;
  };
  landCover: LandCoverBreakdown;
  detectedObjects: DetectedObject[];
  visibleFeatures: string[];
  unresolvableItems: string[];
  resolutionNotice: string;
}

export interface EpistemicEvidence {
  observed: string[];
  detected: string[];
  inferred: string[];
  unknown: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
}

export interface TimelineObservationEvent {
  date: string;
  platform: string;
  sensorType: string;
  summary: string;
  metrics: Record<string, any>;
  thumbnailUrl?: string;
}

export interface TimeSeriesTrendPoint {
  date: string;
  timestamp: number;
  meanNdvi?: number;
  meanNdwi?: number;
  meanMndwi?: number;
  meanEvi?: number;
  meanSavi?: number;
  meanVVBackscatterDb?: number;
  meanVHBackscatterDb?: number;
  crossPolRatioDb?: number;
  cloudCoverPercent?: number;
  validPixelRatio: number;
}

export interface TimeSeriesAnalysisResult {
  targetBbox: GeoBoundingBox;
  startDate: string;
  endDate: string;
  durationDays: number;
  windowLabel: '30_DAYS' | '90_DAYS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';
  observationCount: number;
  actualAcquisitionDates: string[];
  opticalObservationsCount: number;
  sarObservationsCount: number;
  ndviTrend: {
    baselineMean: number;
    latestMean: number;
    delta: number;
    slopePerMonth: number;
    trendDirection: 'INCREASING_GREENNESS' | 'DECREASING_CLEARING' | 'STABLE';
  };
  sarTrend?: {
    baselineMeanDb: number;
    latestMeanDb: number;
    deltaDb: number;
    stability: 'STABLE_RADAR' | 'SURFACE_MODIFIED' | 'TARGET_ADDED';
  };
  points: TimeSeriesTrendPoint[];
}

export interface ChangeAnalysisOutput {
  jobId: string;
  targetLocation: string;
  bbox: GeoBoundingBox;
  timeWindow: {
    startDate: string;
    endDate: string;
    description: string;
  };
  analysisType: AnalysisIntent;
  results: {
    changeDetected: boolean;
    changeAreaHectares: number;
    changeAreaSquareKm: number;
    changeVectorGeoJson: GeoFeatureCollection;
    metrics: Record<string, any>;
    pipelineUsed: string;
  };
  evidence: EpistemicEvidence;
  timeline: TimelineObservationEvent[];
  confidence: {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  answer: string;
  supportingImagery: {
    before?: { date: string; platform: string; sensor: string; url: string };
    after?: { date: string; platform: string; sensor: string; url: string };
    sarRadar?: { date: string; platform: string; sensor: string; url: string };
  };
}

export interface UnifiedEarthObservationResult {
  provenance: {
    isRealData: boolean;
    dataSource: 'COPERNICUS_CDSE_LIVE_DOWNLOAD' | 'COPERNICUS_ODATA_CATALOGUE' | 'COPERNICUS_CDSE' | 'AWS_STAC_OPEN_API' | 'CALIBRATED_BENCHMARK_GRID';
    dataProvider: SatelliteProviderName;
    sceneIds: string[];
    actualAcquisitionDates: string[];
    processingDetails: {
      sarCalibration: string;
      speckleFilter: string;
      opticalScaling: string;
      cloudMasking: string;
      generatedAt: string;
    };
  };
  timeWindow: {
    startDate: string;
    endDate: string;
    durationDays: number;
    comparisonWindow: '30_DAYS' | '90_DAYS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';
  };
  sarResults?: {
    meanDeltaDb: number;
    positiveAnomaliesHectares: number;
    negativeAnomaliesHectares: number;
    anomaliesClustered: number;
    crossPolRatioMeanDb?: number;
    clusters?: Array<{ clusterId: number; size: number; centerRow: number; centerCol: number; maxDb: number }>;
  };
  opticalResults?: {
    meanDeltaNdvi: number;
    meanNdwi?: number;
    meanMndwi?: number;
    vegetationLossHectares: number;
    vegetationGainHectares: number;
    waterSurfaceDeltaHectares?: number;
    meanEvi?: number;
    meanSavi?: number;
  };
  fusedIntelligence: {
    changeDetected: boolean;
    changeClassification: 'PIT_EXPANSION' | 'VEGETATION_CLEARING' | 'WATER_STORAGE_CHANGE' | 'INFRASTRUCTURE_BUILD' | 'STABLE';
    totalModifiedAreaHectares: number;
    confidenceScore: number;
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    pipelineUsed: string;
    changeGeoJson: GeoFeatureCollection;
    geoJsonVectors?: GeoFeatureCollection;
  };
  imageUnderstanding?: ImageUnderstandingResult;
  detectedObjects?: DetectedObject[];
  timeSeries?: TimeSeriesAnalysisResult;
}

export type VesselClassEstimate =
  | 'CONTAINER_CARGO_VESSEL'
  | 'BULK_CARRIER_TANKER'
  | 'OFFSHORE_SUPPLY_TUG'
  | 'COASTAL_FISHING_CRAFT'
  | 'UNRESOLVED_RADAR_TARGET';

export interface VesselPhysicalMetrics {
  estimatedLengthMeters: number;
  estimatedBeamMeters: number;
  aspectRatio: number; // Length / Beam
  radarBackscatterDb: number; // Peak backscatter in dB
  meanClutterFloorDb: number; // Local sea clutter level in dB
  targetToClutterRatioDb: number; // TCR = Peak - Clutter
  estimatedRcsDbsm: number; // Estimated Radar Cross Section in dBsm
  vesselClassEstimate: VesselClassEstimate;
  waterMaskConfirmed: boolean;
  pixelSpan: { rows: number; cols: number };
}

export type VesselValidationGrade =
  | 'VALIDATED_HIGH_CONFIDENCE'
  | 'VALIDATED_PROBABLE'
  | 'REJECTED_FALSE_ALARM'
  | 'REJECTED_LAND_INTERFERENCE'
  | 'UNRESOLVABLE_AT_CURRENT_GSD';

export interface VesselAnnotationCandidate {
  annotationId: string;
  sourceSceneId: string;
  sensorPlatform: 'Sentinel-1A' | 'Sentinel-1B' | 'Commercial-SAR';
  polarization: 'VV' | 'VH' | 'VV+VH';
  bbox: GeoBoundingBox;
  radarBackscatterDb: number;
  estimatedLengthMeters: number;
  estimatedBeamMeters?: number;
  aspectRatio?: number;
  annotatorType: 'ALGORITHM_CFAR' | 'HUMAN_EXPERT' | 'EXTERNAL_AIS_CORRELATION';
  waterMaskConfirmed?: boolean;
  localClutterDb?: number; // Optional measured sea-state clutter level
}

export interface VesselAnnotationValidationResult {
  annotationId: string;
  isValid: boolean;
  validationGrade: VesselValidationGrade;
  vesselClassEstimate: VesselClassEstimate;
  targetToClutterRatioDb: number;
  aspectRatio: number;
  qualityScore: number; // 0.0 to 1.0
  validationNotice: string;
  provenance: {
    sceneId: string;
    platform: string;
    polarization: string;
    calibrationStandard: string;
    speckleFilter: string;
    licensing: string;
    timestamp: string;
  };
  groundTruthVerification?: GroundTruthVerificationRecord;
}

export type GroundTruthStatus =
  | 'CONFIRMED_BY_GEOSPATIAL_ANALYST'
  | 'AIS_CROSS_VALIDATED'
  | 'AUTOMATED_ALGORITHMIC_PREDICTION'
  | 'FLAGGED_FOR_HUMAN_REVIEW'
  | 'REJECTED_FALSE_ALARM';

export interface GroundTruthVerificationRecord {
  status: GroundTruthStatus;
  analystVerification?: {
    analystId: string;
    analystName: string;
    reviewDate: string;
    confidenceRating: number; // 0.0 to 1.0
    notes: string;
    signatureHash: string;
  };
  aisCrossValidation?: {
    mmsi: string;
    vesselName: string;
    imo?: string;
    callsign?: string;
    reportedSpeedKnots: number;
    destination?: string;
    crossCheckConfidence: number; // 0.0 to 1.0
    timeDeltaMinutes: number;
  };
}

export interface HumanGroundTruthReviewSubmission {
  detectionId: string;
  analystId: string;
  analystName: string;
  decision: 'CONFIRM' | 'REJECT' | 'NEEDS_ADDITIONAL_SATELLITE_PASS';
  confidenceRating: number; // 0.0 to 1.0
  notes: string;
  aisCrossChecked?: boolean;
  aisMmsi?: string;
  aisVesselName?: string;
}

export interface DatasetProvenanceAudit {
  datasetId: string;
  sensorPipeline: 'SENTINEL_1_SAR' | 'SENTINEL_2_OPTICAL';
  sceneIds: string[];
  actualAcquisitionDates: string[];
  orbitPass?: 'ASCENDING' | 'DESCENDING';
  polarizationOrBands: string[];
  radiometricStandard: string;
  speckleFilterOrAtmosphericCorrection: string;
  pixelGridSpacingMeters: number;
  trueGroundSamplingDistanceMeters: number;
  dataPolicyAttribution: string;
  integrityHashSha256: string;
}


export type AfricanMaritimeRegion =
  | 'NORTH_AFRICA'
  | 'WEST_AFRICA'
  | 'CENTRAL_AFRICA_GULF_OF_GUINEA'
  | 'EAST_AFRICA_HORN'
  | 'SOUTHERN_AFRICA'
  | 'INDIAN_OCEAN_ISLANDS'
  | 'INLAND_WATERWAYS';

export type HarborType =
  | 'COASTAL_NATURAL'
  | 'COASTAL_BREAKWATER'
  | 'ESTUARY_RIVER'
  | 'OPEN_ANCHORAGE'
  | 'INLAND_FRESHWATER';

export type PortCategory =
  | 'MAJOR_CONTAINER_PORT'
  | 'BULK_COMMODITY_PORT'
  | 'ENERGY_OIL_TERMINAL'
  | 'STRATEGIC_STRAIT_CHOKEPOINT'
  | 'COASTAL_FISHING_ZONE'
  | 'INLAND_LAKE_PORT';

export type DataIntegrityClassification =
  | 'LIVE_COPERNICUS_DOWNLOAD'
  | 'DISCOVERED_CATALOGUE_AWAITING_DOWNLOAD'
  | 'CALIBRATED_BENCHMARK_REFERENCE'
  | 'AWAITING_ORBIT_PASS';

export interface AfricanPortRegistryEntry {
  id: string;
  name: string;
  city?: string;
  country: string;
  region: AfricanMaritimeRegion;
  category: PortCategory;
  harborType: HarborType;
  coordinates: {
    lat: number;
    lon: number;
  };
  bbox: GeoBoundingBox;
  strategicSignificance: string;
  shippingCorridor?: string;
  coverage: {
    sarCoverage: boolean;
    opticalCoverage: boolean;
    recommendedBand: string;
    defaultObservationMode: 'SAR_C_BAND' | 'OPTICAL_MSI';
  };
  operationalStatus: 'OPERATIONAL_LIVE' | 'CALIBRATED_BENCHMARK' | 'AWAITING_PASS';
  typicalVesselTypes?: string[];
}

export interface MaritimeCoverageReport {
  portId?: string;
  portName?: string;
  country?: string;
  region?: AfricanMaritimeRegion;
  bbox: GeoBoundingBox;
  observationDate: string;
  dataIntegrity: DataIntegrityClassification;
  isSimulatedBenchmark: boolean;
  integrityNotice: string;
  availableSatellites: {
    platform: SatellitePlatform;
    sensorType: SensorType;
    status: 'ACTIVE_ORBIT' | 'DISCOVERED_SCENE' | 'CALIBRATED_GRID';
    lastPassDate?: string;
    nextExpectedPassHours?: number;
    resolutionMeters: number;
  }[];
  discoveredScenes?: {
    sceneId: string;
    platform: string;
    acquisitionDate: string;
    cloudCoverPercent?: number;
    orbitDirection?: 'ASCENDING' | 'DESCENDING';
    downloadAvailable: boolean;
  }[];
  vesselSummary: {
    count: number;
    vessels: Array<{
      id: string;
      bbox: GeoBoundingBox;
      metrics: VesselPhysicalMetrics;
      confidence: number;
      isBenchmarkReference: boolean;
    }>;
    seaClutterMeanDb: number;
    waterCoverageRatio: number;
  };
  provenance: DatasetProvenanceAudit;
}
