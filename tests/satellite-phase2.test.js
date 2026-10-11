const { CopernicusCDSEProvider } = require('../backend/dist/modules/satellite/providers/copernicus.provider');
const { STACProvider } = require('../backend/dist/modules/satellite/providers/stac.provider');
const { CommercialSatelliteProvider } = require('../backend/dist/modules/satellite/providers/commercial.provider');
const { NaturalLanguageQueryParser } = require('../backend/dist/modules/satellite/intelligence/queryParser');
const { Sentinel1SARPipeline } = require('../backend/dist/modules/satellite/pipelines/sentinel1.sar');
const { Sentinel2OpticalPipeline } = require('../backend/dist/modules/satellite/pipelines/sentinel2.optical');
const { ChangeDetectionEngine } = require('../backend/dist/modules/satellite/ml/changeDetection');
const { EpistemicReasoner } = require('../backend/dist/modules/satellite/intelligence/epistemicReasoner');

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('AFRIQORA ML-01 PHASE 2 SATELLITE SUITE VALIDATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✔ ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
    }
  }

  // 1. Providers
  console.log('[1/5] Testing Multi-Provider Ingestion Layer...');
  const copernicus = new CopernicusCDSEProvider();
  const stac = new STACProvider();
  const commercial = new CommercialSatelliteProvider();

  const cStatus = await copernicus.healthCheck();
  assert(cStatus.ok, 'Copernicus CDSE Provider connected');

  const sStatus = await stac.healthCheck();
  assert(sStatus.ok, 'STAC AWS Element84 Open Catalog connected');

  const comStatus = await commercial.healthCheck();
  assert(comStatus.ok, 'Commercial Satellite adapter connected');

  // 2. Custom AOI & Scene Search
  console.log('\n[2/5] Testing AOI & Scene Search Across Providers...');
  const tenkeBbox = [26.15, -10.65, 26.25, -10.55];
  const dateRange = {
    start: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    end: new Date(),
  };

  const copScenes = await copernicus.searchScenes(tenkeBbox, dateRange);
  assert(copScenes.length >= 2, `Copernicus retrieved ${copScenes.length} observation scenes`);

  const stacScenes = await stac.searchScenes(tenkeBbox, dateRange);
  assert(stacScenes.length >= 1, `STAC retrieved ${stacScenes.length} optical scenes`);

  // 3. Decoupled Pipelines (SAR & Optical)
  console.log('\n[3/5] Testing Decoupled Sentinel-1 SAR & Sentinel-2 Optical Pipelines...');
  const sar1 = await copernicus.fetchSARScene('S1_T1', tenkeBbox);
  const sar2 = await copernicus.fetchSARScene('S1_T2', tenkeBbox);
  const opt1 = await copernicus.fetchOpticalScene('S2_T1', tenkeBbox);
  const opt2 = await copernicus.fetchOpticalScene('S2_T2', tenkeBbox);

  const sarDiff = Sentinel1SARPipeline.computeSARDifference(sar1.vvGridDb, sar2.vvGridDb);
  assert(sarDiff.diffGrid && typeof sarDiff.meanDeltaDb === 'number', 'SAR Bi-temporal differencing completed');

  const optDiff = Sentinel2OpticalPipeline.computeNDVIDifference(opt1.ndviGrid, opt2.ndviGrid);
  assert(optDiff.deltaNdviGrid && typeof optDiff.meanDeltaNdvi === 'number', 'Optical Bi-temporal NDVI differencing completed');

  // 4. ML Change Detection Fusion
  console.log('\n[4/5] Testing Multi-Sensor Fusion & Change Vectorization...');
  const analysis = ChangeDetectionEngine.runAnalysis({
    analysisType: 'mining_expansion',
    bbox: tenkeBbox,
    beforeSAR: sar1,
    afterSAR: sar2,
    beforeOptical: opt1,
    afterOptical: opt2,
  });

  assert(analysis.confidenceScore > 0.8, `Fusion confidence calculated (${(analysis.confidenceScore * 100).toFixed(1)}%)`);
  assert(analysis.changeVectorGeoJson.type === 'FeatureCollection', 'Generated standard GeoJSON change vector');

  // 5. Epistemic Reasoner & 3-Tier Classification
  console.log('\n[5/5] Testing 3-Tier Epistemological Evidence Reasoner...');
  const synthesis = EpistemicReasoner.synthesizeIntelligence({
    userQuery: 'What happened here in the last 30 days?',
    locationName: 'Tenke Fungurume Mining Complex',
    timeWindow: 'Last 30 Days',
    analysisType: 'mining_expansion',
    changeAreaHectares: analysis.changeAreaHectares,
    metrics: analysis.metrics,
    confidenceScore: analysis.confidenceScore,
    confidenceLevel: analysis.confidenceLevel,
    beforeDate: dateRange.start,
    afterDate: dateRange.end,
    opticalPlatform: 'Sentinel-2A MSI',
    sarPlatform: 'Sentinel-1A SAR',
    cloudCover: opt2.cloudCover,
  });

  assert(synthesis.evidence.observed.length > 0, 'Observed facts explicitly separated');
  assert(synthesis.evidence.detected.length > 0, 'Algorithmic detections explicitly separated');
  assert(synthesis.evidence.inferred.length > 0, 'Interpretations classified as INFERRED only');
  assert(synthesis.timeline.length > 0, 'Observation timeline generated');

  console.log(`\n====================================================`);
  console.log(`PHASE 2 VALIDATION RESULT: ${passed}/${total} PASSED`);
  console.log(`====================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
