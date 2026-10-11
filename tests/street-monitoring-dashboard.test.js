const assert = require('assert');
const { SatelliteController } = require('../backend/dist/modules/satellite/satellite.controller');
const { ChangeDetectionEngine } = require('../backend/dist/modules/satellite/ml/changeDetection');

console.log('================================================================');
console.log('AFRIQORA STREET & AREA MONITORING DASHBOARD VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function check(title, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [${total}] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [${total}] FAIL: ${title}`);
    console.error(`     ${err.message}`);
  }
}

async function asyncCheck(title, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✔ [${total}] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [${total}] FAIL: ${title}`);
    console.error(`     ${err.message}`);
  }
}

async function run() {
  console.log('--- SECTION 1: STREET & SUBURB GEOCODING API ---');

  await asyncCheck('Geocoding: Returns preset African suburbs when query is empty', async () => {
    let responseData = null;
    const mockReq = { query: { q: '' } };
    const mockRes = {
      json: (data) => { responseData = data; },
      status: () => mockRes,
    };

    await SatelliteController.geocodeLocation(mockReq, mockRes);
    assert(responseData && responseData.ok === true, 'Geocoding endpoint returned ok: true');
    assert(Array.isArray(responseData.results) && responseData.results.length >= 5, 'Returned African suburb presets');
    const sandton = responseData.results.find(r => r.suburb.toLowerCase().includes('sandton'));
    assert(sandton !== undefined, 'Contains Sandton preset');
    assert(Array.isArray(sandton.bbox) && sandton.bbox.length === 4, 'Contains valid GeoBoundingBox');
  });

  await asyncCheck('Geocoding: Correctly filters suburb queries (e.g. Kolwezi / Lekki / Tenke)', async () => {
    let responseData = null;
    const mockReq = { query: { q: 'Lekki' } };
    const mockRes = {
      json: (data) => { responseData = data; },
      status: () => mockRes,
    };

    await SatelliteController.geocodeLocation(mockReq, mockRes);
    assert(responseData && responseData.ok === true, 'Resolved query');
    const lekki = responseData.results.find(r => r.name.toLowerCase().includes('lekki'));
    assert(lekki !== undefined, 'Found Lekki suburb');
    assert(lekki.country === 'Nigeria', 'Identified country');
  });

  console.log('\n--- SECTION 2: MULTI-PERIOD STREET MONITORING WORKFLOW ---');

  await asyncCheck('Workflow 1: 30-Day Neighbourhood Change Analysis', async () => {
    let queryResponse = null;
    const mockReq = {
      body: {
        query: 'What changed in Sandton over the last 30 days?',
        customBbox: [28.04, -26.11, 28.07, -26.09],
        timeWindow: '30_days',
        suburbName: 'Sandton CBD',
      }
    };
    const mockRes = {
      json: (data) => { queryResponse = data; },
      status: () => mockRes,
    };

    await SatelliteController.queryIntelligence(mockReq, mockRes);
    assert(queryResponse && queryResponse.ok === true, 'Query succeeded');
    assert(queryResponse.unifiedObservation !== undefined, 'Unified observation attached');
    assert(queryResponse.timeSeries !== undefined, 'Time series trajectory attached');
    assert(queryResponse.supportingImagery.before !== undefined, 'Before imagery attached');
    assert(queryResponse.supportingImagery.after !== undefined, 'After imagery attached');
  });

  await asyncCheck('Workflow 2: 1-Year Multi-Temporal Suburb Expansion Analysis', async () => {
    let queryResponse = null;
    const mockReq = {
      body: {
        query: 'Has Tenke expanded in the last 1 year?',
        customBbox: [26.15, -10.65, 26.25, -10.55],
        timeWindow: '1_year',
        suburbName: 'Tenke Concession',
      }
    };
    const mockRes = {
      json: (data) => { queryResponse = data; },
      status: () => mockRes,
    };

    await SatelliteController.queryIntelligence(mockReq, mockRes);
    assert(queryResponse && queryResponse.ok === true, '1-year query executed');
    assert(queryResponse.parsedQuery.timeWindow.includes('1 year'), 'Identified 1 year time window');
    assert(queryResponse.evidence.observed.length > 0, 'Generated observed facts');
    assert(queryResponse.evidence.detected.length > 0, 'Generated algorithmic detections');
    assert(queryResponse.evidence.inferred.length > 0, 'Generated inferred conclusions');
  });

  console.log('\n================================================================');
  console.log(`STREET MONITORING DASHBOARD RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
