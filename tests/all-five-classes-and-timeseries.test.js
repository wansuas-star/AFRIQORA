const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('AFRIQORA 5-CLASS TAXONOMY & MULTI-TEMPORAL TIME-SERIES SUITE');
console.log('================================================================\n');

const backendDist = path.resolve(__dirname, '../backend/dist');
const { Sentinel1SARPipeline } = require(path.join(backendDist, 'modules/satellite/pipelines/sentinel1.sar'));
const { Sentinel2OpticalPipeline } = require(path.join(backendDist, 'modules/satellite/pipelines/sentinel2.optical'));
const { ChangeDetectionEngine } = require(path.join(backendDist, 'modules/satellite/ml/changeDetection'));

let total = 0;
let passed = 0;

function check(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [${total}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [${total}] FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

const bbox = [26.15, -10.65, 26.25, -10.55]; // Tenke Fungurume Mining AOI

// Baseline Grid Generators
const makeGrid = (val, w=4, h=4) => ({
  width: w,
  height: h,
  bbox,
  resolutionMeters: 10.0,
  data: Array.from({length: h}, () => Array(w).fill(val))
});

const baseSAR = (vvVal = -15.0, vhVal = -21.5) => ({
  sceneId: 'S1A_IW_GRDH_1SDV_20260901T163210',
  acquisitionDate: new Date('2026-09-01T16:32:10Z'),
  polarization: 'VV+VH',
  resolutionMeters: 10.0,
  vvGridDb: makeGrid(vvVal),
  vhGridDb: makeGrid(vhVal),
});

const baseOptical = (red = 0.10, nir = 0.60, green = 0.15, swir = 0.10) => {
  const rGrid = makeGrid(red);
  const nGrid = makeGrid(nir);
  const gGrid = makeGrid(green);
  const sGrid = makeGrid(swir);
  return {
    sceneId: 'S2A_MSIL2A_20260901T082021',
    acquisitionDate: new Date('2026-09-01T08:20:21Z'),
    cloudCover: 1.5,
    resolutionMeters: 10.0,
    redGrid: rGrid,
    greenGrid: gGrid,
    blueGrid: makeGrid(0.05),
    nirGrid: nGrid,
    swirGrid: sGrid,
    sclGrid: makeGrid(4),
    ndviGrid: Sentinel2OpticalPipeline.computeNDVI(nGrid, rGrid),
    ndbiGrid: Sentinel2OpticalPipeline.computeNDBI(sGrid, nGrid),
    mndwiGrid: Sentinel2OpticalPipeline.computeMNDWI(gGrid, sGrid),
  };
};

// ---------------------------------------------------------
// SECTION 1: VALIDATION OF ALL 5 CHANGE DETECTION CLASSES
// ---------------------------------------------------------
console.log('--- SECTION 1: 5-CLASS CHANGE TAXONOMY VALIDATION ---');

check('Class 1: PIT_EXPANSION (Radar Surface Disturbance + Optical Vegetation Clearing)', () => {
  const bSAR = baseSAR(-15.0);
  const aSAR = {
    ...baseSAR(-15.0),
    sceneId: 'S1A_IW_GRDH_1SDV_20261001T163210',
    acquisitionDate: new Date('2026-10-01T16:32:10Z'),
    vvGridDb: {
      ...makeGrid(-15.0),
      data: [
        [-15.0, -15.0, -15.0, -15.0],
        [-15.0, -10.5, -10.8, -15.0], // +4.5 dB radar anomaly (ground modification / excavation)
        [-15.0, -11.0, -10.9, -15.0],
        [-15.0, -15.0, -15.0, -15.0],
      ]
    }
  };

  const bOpt = baseOptical(0.10, 0.60); // High NDVI ~ 0.71
  const aOpt = {
    ...baseOptical(0.28, 0.22), // Low NDVI ~ -0.12 (Surface cleared)
    sceneId: 'S2A_MSIL2A_20261001T082021',
    acquisitionDate: new Date('2026-10-01T08:20:21Z'),
  };

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    beforeSAR: bSAR,
    afterSAR: aSAR,
    beforeOptical: bOpt,
    afterOptical: aOpt,
  });

  assert(result.fusedIntelligence.changeClassification === 'PIT_EXPANSION',
    `Expected PIT_EXPANSION, got ${result.fusedIntelligence.changeClassification}`);
  assert(result.fusedIntelligence.changeDetected === true, 'Change detected');
  assert(result.sarResults.positiveAnomaliesHectares > 0, 'Positive SAR anomalies detected');
  assert(result.opticalResults.vegetationLossHectares > 0, 'Optical vegetation loss detected');
});

check('Class 2: VEGETATION_CLEARING (Optical Clearing without Industrial Radar Reflections)', () => {
  const bOpt = baseOptical(0.10, 0.65); // Dense canopy NDVI ~ 0.73
  const aOpt = {
    ...baseOptical(0.25, 0.20), // Cleared terrain NDVI ~ -0.11
    sceneId: 'S2A_MSIL2A_20261001T082021',
    acquisitionDate: new Date('2026-10-01T08:20:21Z'),
  };

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    beforeOptical: bOpt,
    afterOptical: aOpt,
  });

  assert(result.fusedIntelligence.changeClassification === 'VEGETATION_CLEARING',
    `Expected VEGETATION_CLEARING, got ${result.fusedIntelligence.changeClassification}`);
  assert(result.opticalResults.vegetationLossHectares > 0, 'Vegetation loss quantified');
});

check('Class 3: WATER_STORAGE_CHANGE (MNDWI / NDWI Water Level Modification)', () => {
  // Baseline: dry soil (Green=0.15, SWIR=0.30 -> MNDWI = -0.33)
  const bOpt = baseOptical(0.15, 0.20, 0.15, 0.30);
  // After: water inundation / tailings pond storage (Green=0.35, SWIR=0.05 -> MNDWI = +0.75)
  const aOpt = {
    ...baseOptical(0.05, 0.05, 0.35, 0.05),
    sceneId: 'S2A_MSIL2A_20261001T082021',
    acquisitionDate: new Date('2026-10-01T08:20:21Z'),
  };

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    beforeOptical: bOpt,
    afterOptical: aOpt,
  });

  assert(result.fusedIntelligence.changeClassification === 'WATER_STORAGE_CHANGE',
    `Expected WATER_STORAGE_CHANGE, got ${result.fusedIntelligence.changeClassification}`);
  assert(result.opticalResults.waterSurfaceDeltaHectares > 0, 'Water surface modification quantified');
});

check('Class 4: INFRASTRUCTURE_BUILD (High Radar Reflections & Structural Clusters)', () => {
  const bSAR = baseSAR(-15.0);
  const aSAR = {
    ...baseSAR(-15.0),
    sceneId: 'S1A_IW_GRDH_1SDV_20261001T163210',
    acquisitionDate: new Date('2026-10-01T16:32:10Z'),
    vvGridDb: {
      ...makeGrid(-15.0),
      data: [
        [-15.0, -15.0, -15.0, -15.0],
        [-15.0,  -4.0,  -3.5, -15.0], // Strong metallic double-bounce >= -8.0 dB
        [-15.0,  -5.0, -15.0, -15.0],
        [-15.0, -15.0, -15.0, -15.0],
      ]
    }
  };

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    beforeSAR: bSAR,
    afterSAR: aSAR,
  });

  assert(result.fusedIntelligence.changeClassification === 'INFRASTRUCTURE_BUILD',
    `Expected INFRASTRUCTURE_BUILD, got ${result.fusedIntelligence.changeClassification}`);
  assert(result.sarResults.anomaliesClustered > 0, 'Identified structural clusters');
});

check('Class 5: STABLE (Baseline Stability without Disturbance)', () => {
  const bSAR = baseSAR(-15.0);
  const aSAR = { ...baseSAR(-15.0), sceneId: 'S1A_IW_GRDH_1SDV_20261001T163210', acquisitionDate: new Date('2026-10-01T16:32:10Z') };
  const bOpt = baseOptical(0.10, 0.60);
  const aOpt = { ...baseOptical(0.10, 0.60), sceneId: 'S2A_MSIL2A_20261001T082021', acquisitionDate: new Date('2026-10-01T08:20:21Z') };

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    beforeSAR: bSAR,
    afterSAR: aSAR,
    beforeOptical: bOpt,
    afterOptical: aOpt,
  });

  assert(result.fusedIntelligence.changeClassification === 'STABLE',
    `Expected STABLE, got ${result.fusedIntelligence.changeClassification}`);
  assert(result.fusedIntelligence.changeDetected === false, 'Change detected is false for stable area');
});

// ---------------------------------------------------------
// SECTION 2: MULTI-TEMPORAL TIME-SERIES WINDOWS
// ---------------------------------------------------------
console.log('\n--- SECTION 2: MULTI-TEMPORAL TIME-SERIES WINDOWS ---');

check('Time-Series Window 1: 30_DAYS Window', () => {
  const tStart = new Date('2026-09-10');
  const tEnd = new Date('2026-10-10'); // 30 days
  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: tStart,
    endDate: tEnd,
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
  });
  assert(result.timeWindow.comparisonWindow === '30_DAYS', `Expected 30_DAYS, got ${result.timeWindow.comparisonWindow}`);
  assert(result.timeSeries.windowLabel === '30_DAYS', 'TimeSeries label matches 30_DAYS');
});

check('Time-Series Window 2: 90_DAYS (3 Months) Window', () => {
  const tStart = new Date('2026-07-10');
  const tEnd = new Date('2026-10-10'); // 92 days
  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: tStart,
    endDate: tEnd,
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
  });
  assert(result.timeWindow.comparisonWindow === '90_DAYS', `Expected 90_DAYS, got ${result.timeWindow.comparisonWindow}`);
  assert(result.timeSeries.windowLabel === '90_DAYS', 'TimeSeries label matches 90_DAYS');
});

check('Time-Series Window 3: 6_MONTHS (180 Days) Window', () => {
  const tStart = new Date('2026-04-10');
  const tEnd = new Date('2026-10-10'); // 183 days
  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: tStart,
    endDate: tEnd,
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
  });
  assert(result.timeWindow.comparisonWindow === '6_MONTHS', `Expected 6_MONTHS, got ${result.timeWindow.comparisonWindow}`);
  assert(result.timeSeries.windowLabel === '6_MONTHS', 'TimeSeries label matches 6_MONTHS');
});

check('Time-Series Window 4: 1_YEAR (12 Months) Window', () => {
  const tStart = new Date('2025-10-10');
  const tEnd = new Date('2026-10-10'); // 365 days
  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: tStart,
    endDate: tEnd,
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
  });
  assert(result.timeWindow.comparisonWindow === '1_YEAR', `Expected 1_YEAR, got ${result.timeWindow.comparisonWindow}`);
  assert(result.timeSeries.windowLabel === '1_YEAR', 'TimeSeries label matches 1_YEAR');
});

check('Time-Series Window 5: CUSTOM Multi-Year Window', () => {
  const tStart = new Date('2023-01-01');
  const tEnd = new Date('2026-10-10'); // > 1300 days
  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: tStart,
    endDate: tEnd,
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
  });
  assert(result.timeWindow.comparisonWindow === 'CUSTOM', `Expected CUSTOM, got ${result.timeWindow.comparisonWindow}`);
  assert(result.timeSeries.windowLabel === 'CUSTOM', 'TimeSeries label matches CUSTOM');
});

// ---------------------------------------------------------
// SECTION 3: REAL DATA PROVENANCE & HUMAN QC VALIDATION
// ---------------------------------------------------------
console.log('\n--- SECTION 3: REAL DATA PROVENANCE & HUMAN QC VALIDATION ---');

check('Provenance Integrity: Real Copernicus CDSE Scene IDs and Actual Dates', () => {
  const realS2SceneId = 'S2A_MSIL2A_20260910T082021_N0500_R121_T35KKB_20260910T112233';
  const realS1SceneId = 'S1A_IW_GRDH_1SDV_20260915T163210_038200_048821_B0F4';
  const actualDates = ['2026-09-10', '2026-09-15', '2026-09-25', '2026-10-05', '2026-10-10'];

  const result = ChangeDetectionEngine.generateUnifiedResult({
    bbox,
    startDate: new Date('2026-09-10'),
    endDate: new Date('2026-10-10'),
    isRealData: true,
    dataSource: 'COPERNICUS_CDSE',
    provider: 'copernicus_cdse',
    sceneIds: [realS2SceneId, realS1SceneId],
    actualAcquisitionDates: actualDates,
    processingDetails: {
      calibrationStandard: 'ESA_SAR_RADIOMETRIC_CAL_V2',
      speckleFilter: 'Lee_3x3_Cu_0.5227',
      cloudMaskingSCL: [0, 1, 3, 8, 9, 10],
      humanQCValidation: 'CONFIRMED_BY_GEOSPATIAL_ANALYST',
      aisCrossValidationConfidence: 0.96,
    }
  });

  assert(result.provenance.isRealData === true, 'isRealData must be true for genuine datasets');
  assert(result.provenance.dataSource === 'COPERNICUS_CDSE', 'Tracked COPERNICUS_CDSE data source');
  assert(result.provenance.sceneIds[0] === realS2SceneId, 'Tracked actual Sentinel-2 scene ID');
  assert(result.provenance.sceneIds[1] === realS1SceneId, 'Tracked actual Sentinel-1 scene ID');
  assert(result.provenance.actualAcquisitionDates.length === 5, 'Exact 5 actual acquisition dates preserved');
  assert(result.provenance.processingDetails.humanQCValidation === 'CONFIRMED_BY_GEOSPATIAL_ANALYST', 'Human QC validation preserved');
  assert(result.provenance.processingDetails.aisCrossValidationConfidence === 0.96, 'AIS cross-verification confidence recorded');
});

console.log(`\n================================================================`);
console.log(`5-CLASS & TIME-SERIES SUITE RESULT: ${passed}/${total} PASSED`);
console.log(`================================================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
