const assert = require('assert');
const path = require('path');

console.log('====================================================');
console.log('AFRIQORA ML-01 SATELLITE INTELLIGENCE TEST SUITE');
console.log('====================================================\n');

// 1. Test Sentinel-1 SAR Pipeline
console.log('[1/6] Testing Sentinel-1 SAR Pipeline...');
const { Sentinel1SARPipeline } = require('./dist/modules/satellite/pipelines/sentinel1.sar');

const dn = 100;
const dbVal = Sentinel1SARPipeline.calibrateDNtoDecibels(dn);
assert(Math.abs(dbVal - 40.0) < 0.01, `Calibration failed: got ${dbVal}, expected ~40.0 dB`);
console.log('  ✔ SAR Radiometric Calibration DN -> dB passed');

const testGrid = {
  width: 4,
  height: 4,
  bbox: [26.15, -10.65, 26.25, -10.55],
  resolutionMeters: 10.0,
  data: [
    [-15.0, -15.2, -14.8, -15.1],
    [-14.9, -5.0,  -15.0, -14.8],
    [-15.1, -15.0, -15.2, -15.0],
    [-15.0, -14.9, -15.1, -15.0],
  ]
};

const filtered = Sentinel1SARPipeline.applyLeeFilter(testGrid, 3);
assert(filtered.width === 4 && filtered.height === 4, 'Lee filter dimensions match');
console.log('  ✔ SAR Lee Speckle Filtering passed');

const t2Grid = {
  ...testGrid,
  data: [
    [-15.0, -15.2, -14.8, -15.1],
    [-14.9, -10.0, -10.5, -14.8],
    [-15.1, -10.2, -10.1, -15.0],
    [-15.0, -14.9, -15.1, -15.0],
  ]
};

const sarDiff = Sentinel1SARPipeline.computeSARDifference(testGrid, t2Grid, 2.5);
assert(sarDiff.anomalyPixelCount > 0, 'SAR difference detected anomalies');
console.log(`  ✔ SAR Bi-temporal Differencing passed (Detected ${sarDiff.positiveAnomaliesHectares} ha positive anomalies)`);

// 2. Test Sentinel-2 Optical Pipeline
console.log('\n[2/6] Testing Sentinel-2 Optical Pipeline...');
const { Sentinel2OpticalPipeline } = require('./dist/modules/satellite/pipelines/sentinel2.optical');

const nirGrid = { ...testGrid, data: Array.from({length:4}, () => [0.60, 0.60, 0.60, 0.60]) };
const redGrid = { ...testGrid, data: Array.from({length:4}, () => [0.10, 0.10, 0.10, 0.10]) };
const ndvi = Sentinel2OpticalPipeline.computeNDVI(nirGrid, redGrid);
assert(Math.abs(ndvi.data[0][0] - (0.5 / 0.7)) < 0.01, `NDVI computation mismatch: ${ndvi.data[0][0]}`);
console.log(`  ✔ Optical NDVI Computation passed (${ndvi.data[0][0].toFixed(3)})`);

const t2Nir = { ...testGrid, data: Array.from({length:4}, () => [0.20, 0.20, 0.20, 0.20]) };
const t2Red = { ...testGrid, data: Array.from({length:4}, () => [0.25, 0.25, 0.25, 0.25]) };
const t2Ndvi = Sentinel2OpticalPipeline.computeNDVI(t2Nir, t2Red);

const optDiff = Sentinel2OpticalPipeline.computeNDVIDifference(ndvi, t2Ndvi);
assert(optDiff.vegetationLossHectares > 0, 'Vegetation loss quantified in hectares');
console.log(`  ✔ Optical Bi-temporal NDVI Differencing passed (${optDiff.vegetationLossHectares} ha cleared)`);


// Test Extended SAR & Optical Capabilities
console.log('\n[Extended 1/2] Testing Cross-Pol Ratio & SAR Anomaly Clustering...');
const vhTestGrid = { ...testGrid, data: testGrid.data.map(row => row.map(v => v - 6.5)) };
const crossRatio = Sentinel1SARPipeline.computeCrossPolRatio(vhTestGrid, testGrid);
assert(crossRatio.data[0][0] < 0, 'Cross-Pol ratio calculated');
console.log('  ✔ Dual-Pol Cross-Polarization Ratio (VH-VV) passed (' + crossRatio.data[0][0] + ' dB)');

const clusterTargets = [
  { row: 1, col: 1, backscatterDb: -5.0 },
  { row: 1, col: 2, backscatterDb: -6.0 },
  { row: 3, col: 3, backscatterDb: -4.0 }
];
const clusters = Sentinel1SARPipeline.clusterAnomalies(clusterTargets, 2);
assert(clusters.length === 2, 'Clustered into 2 discrete structural spatial groups');
console.log('  ✔ SAR Radar Anomaly Spatial Clustering passed (' + clusters.length + ' clusters identified)');

console.log('\n[Extended 2/2] Testing Optical EVI & Multi-Band Spectral Profiling...');
const blueGrid = { ...testGrid, data: Array.from({length:4}, () => [0.05, 0.05, 0.05, 0.05]) };
const evi = Sentinel2OpticalPipeline.computeEVI(nirGrid, redGrid, blueGrid);
assert(evi.data[0][0] > 0, 'EVI index computed successfully');
console.log('  ✔ Optical Enhanced Vegetation Index (EVI) passed (' + evi.data[0][0].toFixed(3) + ')');

const mockOptScene = {
  redGrid,
  greenGrid: blueGrid,
  blueGrid,
  nirGrid,
  swirGrid: redGrid
};
const profile = Sentinel2OpticalPipeline.extractSpectralProfile(mockOptScene, 0, 0);
assert(profile.length === 5, '5 multi-spectral bands extracted');
console.log('  ✔ Multi-Spectral Signature Profile Extraction passed (Bands: ' + profile.map(p => p.band.split(' ')[0]).join(', ') + ')');

// 3. Test Provider Abstraction Layer
console.log('\n[3/6] Testing Provider Abstraction Layer...');
const { CopernicusCDSEProvider } = require('./dist/modules/satellite/providers/copernicus.provider');
const { STACProvider } = require('./dist/modules/satellite/providers/stac.provider');
const { CommercialSatelliteProvider } = require('./dist/modules/satellite/providers/commercial.provider');

const copernicus = new CopernicusCDSEProvider();
const stac = new STACProvider();
const commercial = new CommercialSatelliteProvider();

async function runProviderTests() {
  const cdseStatus = await copernicus.healthCheck();
  assert(cdseStatus.ok, 'Copernicus healthcheck ok');
  console.log('  ✔ Copernicus CDSE provider healthy');

  const stacStatus = await stac.healthCheck();
  assert(stacStatus.ok, 'STAC provider healthy');
  console.log('  ✔ STAC Open catalog provider healthy');

  const commStatus = await commercial.healthCheck();
  assert(commStatus.ok, 'Commercial provider healthy');
  console.log('  ✔ Commercial satellite pluggable provider healthy');
}

// 4. Test Natural Language Query Parser
console.log('\n[4/6] Testing Natural Language Query Parser...');
const { NaturalLanguageQueryParser } = require('./dist/modules/satellite/intelligence/queryParser');

const q1 = NaturalLanguageQueryParser.parseQuery('What happened here in the last 30 days?');
assert(q1.timeWindowDescription === 'Last 30 Days', 'Parsed 30 days window');
console.log('  ✔ Query 1: "What happened here in the last 30 days?" -> Parsed timeframe: Last 30 Days');

const q2 = NaturalLanguageQueryParser.parseQuery('Has the Tenke mine expanded in the last 3 months?');
assert(q2.analysisIntent === 'mining_expansion', 'Parsed mining expansion intent');
assert(q2.targetLocation.includes('Tenke'), 'Recognized Tenke mine location');
console.log('  ✔ Query 2: "Has the Tenke mine expanded in the last 3 months?" -> Parsed location & intent: mining_expansion');

const q3 = NaturalLanguageQueryParser.parseQuery('What activity has occurred around the port of Richards Bay?');
assert(q3.analysisIntent === 'port_vessel_activity', 'Parsed port activity intent');
console.log('  ✔ Query 3: "What activity has occurred around the port of Richards Bay?" -> Parsed intent: port_vessel_activity');

// 5. Test ML Change Detection Core & Epistemic Reasoner
console.log('\n[5/6] Testing ML Change Detection & Epistemic Reasoner...');
// ChangeDetectionEngine initial declaration
const { ChangeDetectionEngine } = require('./dist/modules/satellite/ml/changeDetection');
const { EpistemicReasoner } = require('./dist/modules/satellite/intelligence/epistemicReasoner');

async function testMLAndReasoning() {
  const [bSar, aSar, bOpt, aOpt] = await Promise.all([
    copernicus.fetchSARScene('S1A_1', [26.15, -10.65, 26.25, -10.55]),
    copernicus.fetchSARScene('S1A_2', [26.15, -10.65, 26.25, -10.55]),
    copernicus.fetchOpticalScene('S2A_1', [26.15, -10.65, 26.25, -10.55]),
    copernicus.fetchOpticalScene('S2A_2', [26.15, -10.65, 26.25, -10.55]),
  ]);

  const mlResult = ChangeDetectionEngine.runAnalysis({
    analysisType: 'mining_expansion',
    bbox: [26.15, -10.65, 26.25, -10.55],
    beforeSAR: bSar,
    afterSAR: aSar,
    beforeOptical: bOpt,
    afterOptical: aOpt,
  });

  assert(mlResult.confidenceScore > 0, 'Confidence score calculated');
  assert(mlResult.changeVectorGeoJson.type === 'FeatureCollection', 'Generated GeoJSON vectors');
  console.log(`  ✔ ML Change Detection executed: Confidence ${mlResult.confidenceScore} (${mlResult.confidenceLevel}), Pipeline: ${mlResult.pipelineUsed}`);

  const synthesis = EpistemicReasoner.synthesizeIntelligence({
    userQuery: 'Has this mine expanded?',
    locationName: 'Tenke Fungurume Copper-Cobalt Mine (DRC)',
    timeWindow: 'Last 30 Days',
    analysisType: 'mining_expansion',
    changeAreaHectares: mlResult.changeAreaHectares || 14.5,
    metrics: mlResult.metrics,
    confidenceScore: mlResult.confidenceScore,
    confidenceLevel: mlResult.confidenceLevel,
    beforeDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    afterDate: new Date(),
  });

  assert(synthesis.evidence.observed.length > 0, 'OBSERVED facts present');
  assert(synthesis.evidence.detected.length > 0, 'DETECTED facts present');
  assert(synthesis.evidence.inferred.length > 0, 'INFERRED conclusions present');
  assert(synthesis.writtenAnswer.length > 20, 'Written intelligence answer generated');
  console.log('  ✔ Epistemic Reasoner successfully separated:');
  console.log('     [OBSERVED]:', synthesis.evidence.observed[0]);
  console.log('     [DETECTED]:', synthesis.evidence.detected[0]);
  console.log('     [INFERRED]:', synthesis.evidence.inferred[0]);
}


// Test Safety & Robust Input Validation
console.log('\n[Validation 1/3] Testing SAR Input Validation & NaN/Zero Safety...');
assert(Sentinel1SARPipeline.calibrateDNtoDecibels(0) === -40.0, 'Zero DN calibrated to noise floor');
assert(Sentinel1SARPipeline.calibrateDNtoDecibels(-5) === -40.0, 'Negative DN handled safely');
assert(Sentinel1SARPipeline.calibrateDNtoDecibels(NaN) === -40.0, 'NaN DN handled safely');

const nanGrid = {
  width: 3,
  height: 3,
  bbox: [26.15, -10.65, 26.25, -10.55],
  resolutionMeters: 10.0,
  data: [
    [-15.0, NaN, -15.0],
    [NaN, -5.0, NaN],
    [-15.0, NaN, -15.0]
  ]
};
const filteredNan = Sentinel1SARPipeline.applyLeeFilter(nanGrid, 3);
assert(!isNaN(filteredNan.data[0][0]), 'Lee filter gracefully handles NaN pixels');
console.log('  ✔ SAR Zero/Negative/NaN safety validation passed');

console.log('\n[Validation 2/3] Testing Optical NDWI, MNDWI & SCL Cloud Masking...');
const greenGrid = { ...testGrid, data: Array.from({length:4}, () => [0.30, 0.30, 0.30, 0.30]) };
const swirGrid = { ...testGrid, data: Array.from({length:4}, () => [0.10, 0.10, 0.10, 0.10]) };
const ndwi = Sentinel2OpticalPipeline.computeNDWI(greenGrid, nirGrid);
assert(ndwi.data[0][0] < 0, 'NDWI computed');
const mndwi = Sentinel2OpticalPipeline.computeMNDWI(greenGrid, swirGrid);
assert(mndwi.data[0][0] > 0, 'MNDWI computed positive for water');
console.log('  ✔ Optical NDWI & MNDWI computed (MNDWI = ' + mndwi.data[0][0] + ')');

const sclGrid = { ...testGrid, data: [[4, 8], [9, 3]] };
const maskedGrid = Sentinel2OpticalPipeline.applySCLCloudMask(greenGrid, sclGrid);
assert(isNaN(maskedGrid.data[0][1]) && isNaN(maskedGrid.data[1][0]), 'Cloud/Shadow pixels masked to NaN');
console.log('  ✔ Optical SCL Cloud/Shadow masking passed');

console.log('\n[Validation 3/3] Testing Unified Earth Observation Result & Time-Series Windows...');

// ChangeDetectionEngine re-used

const t10DaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
const tNow = new Date();

const unifiedResult = ChangeDetectionEngine.generateUnifiedResult({
  bbox: [26.15, -10.65, 26.25, -10.55],
  startDate: t10DaysAgo,
  endDate: tNow,
  isRealData: true,
  dataSource: 'COPERNICUS_ODATA_CATALOGUE',
  provider: 'copernicus_cdse',
  sceneIds: ['S2A_MSIL2A_20260909', 'S1A_IW_GRDH_20260915'],
  beforeSAR: { sceneId: 'S1A_1', acquisitionDate: t10DaysAgo, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: testGrid, vhGridDb: vhTestGrid },
  afterSAR: { sceneId: 'S1A_2', acquisitionDate: tNow, polarization: 'VV+VH', resolutionMeters: 10, vvGridDb: t2Grid, vhGridDb: vhTestGrid },
  beforeOptical: { sceneId: 'S2A_1', acquisitionDate: t10DaysAgo, cloudCover: 2, resolutionMeters: 10, redGrid, greenGrid, blueGrid, nirGrid, swirGrid, sclGrid: { ...testGrid, data: Array.from({length:4}, () => [4,4,4,4]) }, ndviGrid: ndvi, ndbiGrid: ndvi, mndwiGrid: mndwi },
  afterOptical: { sceneId: 'S2A_2', acquisitionDate: tNow, cloudCover: 3, resolutionMeters: 10, redGrid: t2Red, greenGrid, blueGrid, nirGrid: t2Nir, swirGrid, sclGrid: { ...testGrid, data: Array.from({length:4}, () => [4,4,4,4]) }, ndviGrid: t2Ndvi, ndbiGrid: t2Ndvi, mndwiGrid: mndwi }
});

assert(unifiedResult.timeWindow.comparisonWindow === '30_DAYS', 'Correctly resolved 30_DAYS window');
assert(unifiedResult.provenance.isRealData === true, 'Provenance correctly tracks real data source');
assert(unifiedResult.fusedIntelligence.changeDetected === true, 'Fused change detected');
assert(unifiedResult.fusedIntelligence.geoJsonVectors.type === 'FeatureCollection', 'Generated standard GeoJSON vectors');
console.log('  ✔ Unified Earth Observation Output validated (Classification: ' + unifiedResult.fusedIntelligence.changeClassification + ', Window: ' + unifiedResult.timeWindow.comparisonWindow + ')');

(async () => {
  try {
    await runProviderTests();
    await testMLAndReasoning();
    console.log('\n[6/6] All Satellite & ML Unit/Integration Tests PASSED (6/6)! 🎉\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
})();
