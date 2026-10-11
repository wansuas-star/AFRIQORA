const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('AFRIQORA EARTH OBSERVATION (EO) COMPREHENSIVE VERIFICATION SUITE');
console.log('================================================================\n');

const backendDist = path.resolve(__dirname, '../backend/dist');
const { Sentinel1SARPipeline } = require(path.join(backendDist, 'modules/satellite/pipelines/sentinel1.sar'));
const { Sentinel2OpticalPipeline } = require(path.join(backendDist, 'modules/satellite/pipelines/sentinel2.optical'));
const { ChangeDetectionEngine } = require(path.join(backendDist, 'modules/satellite/ml/changeDetection'));
const { EpistemicReasoner } = require(path.join(backendDist, 'modules/satellite/intelligence/epistemicReasoner'));
const { CopernicusCDSEProvider } = require(path.join(backendDist, 'modules/satellite/providers/copernicus.provider'));
const { STACProvider } = require(path.join(backendDist, 'modules/satellite/providers/stac.provider'));
const { CommercialSatelliteProvider } = require(path.join(backendDist, 'modules/satellite/providers/commercial.provider'));

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [${totalTests}] FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✔ [${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [${totalTests}] FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

async function runAll() {
  console.log('--- SECTION 1: SENTINEL-1 SAR PIPELINE VERIFICATION ---');

  test('SAR Calibration: Positive linear DN conversion to dB', () => {
    const db = Sentinel1SARPipeline.calibrateDNtoDecibels(100);
    assert(Math.abs(db - 40.0) < 0.01, `Expected 40.0 dB, got ${db}`);
  });

  test('SAR Calibration: Zero, negative, NaN, null and Infinity input safety', () => {
    assert(Sentinel1SARPipeline.calibrateDNtoDecibels(0) === -40.0, 'Zero DN returns -40.0 dB');
    assert(Sentinel1SARPipeline.calibrateDNtoDecibels(-10) === -40.0, 'Negative DN returns -40.0 dB');
    assert(Sentinel1SARPipeline.calibrateDNtoDecibels(NaN) === -40.0, 'NaN returns -40.0 dB');
    assert(Sentinel1SARPipeline.calibrateDNtoDecibels(null) === -40.0, 'Null returns -40.0 dB');
    assert(Sentinel1SARPipeline.calibrateDNtoDecibels(Infinity) === -40.0, 'Infinity returns -40.0 dB');
  });

  test('SAR Lee Speckle Filter: Noise reduction and NaN boundary preservation', () => {
    const noisyGrid = {
      width: 4,
      height: 4,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: [
        [-14.0, -16.0, NaN, -14.5],
        [-15.0, -5.0, -15.5, -14.0], // bright target at (1,1)
        [-14.8, -15.2, -14.9, -15.0],
        [NaN, -15.0, -14.8, -15.1],
      ]
    };
    const filtered = Sentinel1SARPipeline.applyLeeFilter(noisyGrid, 3);
    assert(filtered.width === 4 && filtered.height === 4, 'Preserved dimensions');
    assert(!isNaN(filtered.data[1][1]), 'Center target filtered safely');
    assert(filtered.data[0][2] === -40.0, 'NaN boundary filled with noise floor');
  });

  test('SAR Cross-Polarization Ratio: Dual-pol (VH - VV in dB)', () => {
    const vvGrid = {
      width: 3,
      height: 3,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: [
        [-12.0, -12.0, -12.0],
        [-12.0, -12.0, -12.0],
        [-12.0, -12.0, -12.0],
      ]
    };
    const vhGrid = {
      width: 3,
      height: 3,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: [
        [-18.5, -18.5, -18.5],
        [-18.5, -18.5, -18.5],
        [-18.5, -18.5, -18.5],
      ]
    };
    const ratioGrid = Sentinel1SARPipeline.computeCrossPolRatio(vhGrid, vvGrid);
    assert(Math.abs(ratioGrid.data[0][0] - (-6.5)) < 0.01, `Expected -6.5 dB ratio, got ${ratioGrid.data[0][0]}`);
  });

  test('SAR High-Backscatter Target Detection & Spatial Clustering', () => {
    const targetGrid = {
      width: 6,
      height: 6,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: [
        [-15, -15, -15, -15, -15, -15],
        [-15,  -4,  -5, -15, -15, -15], // Cluster 1: (1,1), (1,2)
        [-15,  -6, -15, -15, -15, -15], // Cluster 1: (2,1)
        [-15, -15, -15, -15, -15, -15],
        [-15, -15, -15, -15,  -3, -15], // Cluster 2: (4,4)
        [-15, -15, -15, -15, -15, -15],
      ]
    };
    const targets = Sentinel1SARPipeline.detectHighBackscatterTargets(targetGrid, -8.0);
    assert(targets.targetCount === 4, `Expected 4 bright targets, got ${targets.targetCount}`);

    const clusters = Sentinel1SARPipeline.clusterAnomalies(targets.targetLocations, 2);
    assert(clusters.length === 2, `Expected 2 spatial clusters, got ${clusters.length}`);
    assert(clusters[0].size === 3, `Cluster 1 size should be 3, got ${clusters[0].size}`);
    assert(clusters[1].size === 1, `Cluster 2 size should be 1, got ${clusters[1].size}`);
  });

  test('SAR Bi-temporal Differencing: Ground modification quantification', () => {
    const t1 = {
      width: 4,
      height: 4,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: Array.from({length: 4}, () => [-15.0, -15.0, -15.0, -15.0])
    };
    const t2 = {
      width: 4,
      height: 4,
      bbox: [26.15, -10.65, 26.25, -10.55],
      data: [
        [-15.0, -15.0, -15.0, -15.0],
        [-15.0, -11.0, -11.0, -15.0], // +4.0 dB disturbance (2 pixels = 0.02 ha)
        [-15.0, -15.0, -15.0, -15.0],
        [-15.0, -15.0, -15.0, -15.0],
      ],
      resolutionMeters: 10.0,
    };
    const diff = Sentinel1SARPipeline.computeSARDifference(t1, t2, 2.5);
    assert(diff.positiveAnomaliesHectares === 0.02, `Expected 0.02 ha positive anomalies, got ${diff.positiveAnomaliesHectares}`);
    assert(diff.anomalyPixelCount === 2, `Expected 2 anomaly pixels, got ${diff.anomalyPixelCount}`);
  });

  console.log('\n--- SECTION 2: SENTINEL-2 OPTICAL PIPELINE VERIFICATION ---');

  test('Optical Calibration: Integer DN to Reflectance scaling', () => {
    const rawGrid = {
      width: 2,
      height: 2,
      bbox: [26.15, -10.65, 26.25, -10.55],
      resolutionMeters: 10.0,
      data: [[2000, 5000], [8000, 10000]]
    };
    const cal = Sentinel2OpticalPipeline.calibrateReflectance(rawGrid, 10000);
    assert(cal.data[0][0] === 0.2000, '2000 scaled to 0.2000');
    assert(cal.data[1][1] === 1.0000, '10000 scaled to 1.0000');
  });

  test('Optical Indices: NDVI calculation', () => {
    const nir = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.60]] };
    const red = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.20]] };
    const ndvi = Sentinel2OpticalPipeline.computeNDVI(nir, red);
    assert(Math.abs(ndvi.data[0][0] - 0.50) < 0.001, `Expected 0.50, got ${ndvi.data[0][0]}`);
  });

  test('Optical Indices: NDWI and MNDWI water indices', () => {
    const green = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.35]] };
    const nir = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.15]] };
    const swir = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.05]] };

    const ndwi = Sentinel2OpticalPipeline.computeNDWI(green, nir);
    assert(ndwi.data[0][0] > 0, 'NDWI positive for water');

    const mndwi = Sentinel2OpticalPipeline.computeMNDWI(green, swir);
    assert(mndwi.data[0][0] > ndwi.data[0][0], 'MNDWI enhances water discrimination over SWIR');
  });

  test('Optical Indices: NDBI, EVI, SAVI and MSAVI', () => {
    const blue = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.05]] };
    const red = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.12]] };
    const nir = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.55]] };
    const swir = { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.22]] };

    const ndbi = Sentinel2OpticalPipeline.computeNDBI(swir, nir);
    assert(ndbi.data[0][0] < 0, 'Vegetated terrain has negative NDBI');

    const evi = Sentinel2OpticalPipeline.computeEVI(nir, red, blue);
    assert(evi.data[0][0] > 0.4, 'High biomass canopy produces high EVI');

    const savi = Sentinel2OpticalPipeline.computeSAVI(nir, red, 0.5);
    assert(savi.data[0][0] > 0.3, 'SAVI calculated with soil factor');

    const msavi = Sentinel2OpticalPipeline.computeMSAVI(nir, red);
    assert(msavi.data[0][0] > 0.3, 'MSAVI calculated with iterative soil factor');
  });

  test('Optical SCL Cloud & Shadow Masking', () => {
    const dataGrid = { width: 2, height: 2, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.8, 0.8], [0.8, 0.8]] };
    const sclGrid = { width: 2, height: 2, bbox: [0,0,1,1], resolutionMeters: 10, data: [[4, 8], [9, 3]] };
    const masked = Sentinel2OpticalPipeline.applySCLCloudMask(dataGrid, sclGrid);
    assert(!isNaN(masked.data[0][0]), 'Vegetation SCL 4 is preserved');
    assert(isNaN(masked.data[0][1]), 'Cloud medium SCL 8 is masked to NaN');
    assert(isNaN(masked.data[1][0]), 'Cloud high SCL 9 is masked to NaN');
    assert(isNaN(masked.data[1][1]), 'Cloud shadow SCL 3 is masked to NaN');
  });

  test('Optical Multi-Band Spectral Signature extraction', () => {
    const scene = {
      sceneId: 'TEST_S2',
      acquisitionDate: new Date(),
      cloudCover: 0,
      resolutionMeters: 10,
      blueGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.04]] },
      greenGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.08]] },
      redGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.05]] },
      nirGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.65]] },
      swirGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.18]] },
      sclGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[4]] },
      ndviGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[0.85]] },
      ndbiGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[-0.5]] },
      mndwiGrid: { width: 1, height: 1, bbox: [0,0,1,1], resolutionMeters: 10, data: [[-0.3]] },
    };
    const profile = Sentinel2OpticalPipeline.extractSpectralProfile(scene, 0, 0);
    assert(profile.length === 5, '5 spectral bands extracted');
    assert(profile[3].band.includes('NIR') && profile[3].reflectance === 0.65, 'NIR reflectance match');
  });

  console.log('\n--- SECTION 3: INTEGRATED PIPELINES & UNIFIED EO OUTPUT ---');

  test('Unified Earth Observation Result: 30-Day Window & Provenance Tracking', () => {
    const tStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const tEnd = new Date();
    const bbox = [26.15, -10.65, 26.25, -10.55];

    const dummyGrid = { width: 4, height: 4, bbox, resolutionMeters: 10, data: Array.from({length:4}, () => [0.5, 0.5, 0.5, 0.5]) };
    const t2NdviGrid = { width: 4, height: 4, bbox, resolutionMeters: 10, data: Array.from({length:4}, () => [0.2, 0.2, 0.2, 0.2]) };

    const unified = ChangeDetectionEngine.generateUnifiedResult({
      bbox,
      startDate: tStart,
      endDate: tEnd,
      isRealData: true,
      dataSource: 'COPERNICUS_ODATA_CATALOGUE',
      provider: 'copernicus_cdse',
      sceneIds: ['S2A_MSIL2A_20260910', 'S1A_IW_GRDH_20260915'],
      actualAcquisitionDates: ['2026-09-10', '2026-09-25', '2026-10-10'],
      beforeSAR: { sceneId: 'S1_1', acquisitionDate: tStart, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: dummyGrid, vhGridDb: dummyGrid },
      afterSAR: { sceneId: 'S1_2', acquisitionDate: tEnd, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: dummyGrid, vhGridDb: dummyGrid },
      beforeOptical: { sceneId: 'S2_1', acquisitionDate: tStart, cloudCover: 2, resolutionMeters: 10, redGrid: dummyGrid, greenGrid: dummyGrid, blueGrid: dummyGrid, nirGrid: dummyGrid, swirGrid: dummyGrid, sclGrid: dummyGrid, ndviGrid: dummyGrid, ndbiGrid: dummyGrid, mndwiGrid: dummyGrid },
      afterOptical: { sceneId: 'S2_2', acquisitionDate: tEnd, cloudCover: 2, resolutionMeters: 10, redGrid: dummyGrid, greenGrid: dummyGrid, blueGrid: dummyGrid, nirGrid: dummyGrid, swirGrid: dummyGrid, sclGrid: dummyGrid, ndviGrid: t2NdviGrid, ndbiGrid: dummyGrid, mndwiGrid: dummyGrid },
    });

    assert(unified.timeWindow.comparisonWindow === '30_DAYS', 'Resolved 30_DAYS window');
    assert(unified.provenance.isRealData === true, 'Tracked isRealData provenance');
    assert(unified.provenance.actualAcquisitionDates.length === 3, 'Actual acquisition dates reported');
    assert(unified.fusedIntelligence.changeDetected === true, 'Change detected');
    assert(unified.fusedIntelligence.geoJsonVectors.type === 'FeatureCollection', 'Standard GeoJSON output');
    assert(unified.timeSeries !== undefined, 'Time-series analysis included');
  });

  test('Unified Earth Observation Result: 1-Year Multi-Temporal Window', () => {
    const tStart = new Date(Date.now() - 365 * 24 * 3600 * 1000);
    const tEnd = new Date();
    const bbox = [26.15, -10.65, 26.25, -10.55];
    const dummyGrid = { width: 4, height: 4, bbox, resolutionMeters: 10, data: Array.from({length:4}, () => [0.5, 0.5, 0.5, 0.5]) };

    const unified = ChangeDetectionEngine.generateUnifiedResult({
      bbox,
      startDate: tStart,
      endDate: tEnd,
      isRealData: true,
      dataSource: 'COPERNICUS_ODATA_CATALOGUE',
      beforeSAR: { sceneId: 'S1_1', acquisitionDate: tStart, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: dummyGrid, vhGridDb: dummyGrid },
      afterSAR: { sceneId: 'S1_2', acquisitionDate: tEnd, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: dummyGrid, vhGridDb: dummyGrid },
    });

    assert(unified.timeWindow.comparisonWindow === '1_YEAR', 'Resolved 1_YEAR window');
    assert(unified.timeWindow.durationDays >= 360, 'Duration reflects 1 year');
  });

  console.log('\n--- SECTION 4: PROVIDER ABSTRACTION & CATALOGUE VERIFICATION ---');

  await asyncTest('Copernicus CDSE Healthcheck and Catalogue Search', async () => {
    const copernicus = new CopernicusCDSEProvider();
    const status = await copernicus.healthCheck();
    assert(status.ok, 'CDSE health check passed');

    const scenes = await copernicus.searchScenes(
      [26.15, -10.65, 26.25, -10.55],
      { start: new Date(Date.now() - 30 * 24 * 3600 * 1000), end: new Date() }
    );
    assert(scenes.length >= 2, 'Retrieved multi-scene catalogue sequence');
    assert(scenes[0].id.startsWith('S1') || scenes[0].id.startsWith('S2'), 'Genuine Sentinel product naming');
  });

  await asyncTest('STAC & Commercial Provider Healthcheck', async () => {
    const stac = new STACProvider();
    const commercial = new CommercialSatelliteProvider();

    const sStatus = await stac.healthCheck();
    assert(sStatus.ok, 'STAC catalog healthy');

    const cStatus = await commercial.healthCheck();
    assert(cStatus.ok, 'Commercial provider healthy');
  });

  console.log(`\n================================================================`);
  console.log(`VERIFICATION RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`================================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
