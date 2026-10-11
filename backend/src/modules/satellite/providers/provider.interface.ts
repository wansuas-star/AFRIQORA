import { GeoBoundingBox, OpticalScenePayload, RawSceneMetadata, SARScenePayload, SatellitePlatform, SatelliteProviderName } from '../types';

export interface ISatelliteProvider {
  readonly name: SatelliteProviderName;
  readonly supportedPlatforms: SatellitePlatform[];

  searchScenes(
    bbox: GeoBoundingBox,
    dateRange: { start: Date; end: Date },
    platform?: SatellitePlatform,
    maxCloudCover?: number
  ): Promise<RawSceneMetadata[]>;

  fetchSARScene(sceneId: string, bbox: GeoBoundingBox): Promise<SARScenePayload>;
  fetchOpticalScene(sceneId: string, bbox: GeoBoundingBox): Promise<OpticalScenePayload>;
  healthCheck(): Promise<{ ok: boolean; status: string; latencyMs: number }>;
}
