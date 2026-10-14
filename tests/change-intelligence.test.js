const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4001';

async function runTests() {
  console.log('================================================================');
  console.log('AFRIQORA CHANGE INTELLIGENCE MVP — ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✔ [${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [${total}] ${name}: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✔ [${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [${total}] ${name}: ${err.message}`);
    }
  }

  console.log('--- SECTION 1: CHANGE INTELLIGENCE PRESETS & DISCOVERY ---');

  await asyncTest('GET /api/satellite/change/presets returns official African monitoring corridors', async () => {
    const res = await fetch(`${BASE_URL}/api/satellite/change/presets`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.strictEqual(data.ok, true, 'ok should be true');
    assert(Array.isArray(data.presets), 'presets must be an array');
    assert(data.presets.length >= 6, 'Must contain at least 6 presets');

    const ids = data.presets.map((p) => p.id);
    assert(ids.includes('gerd'), 'Must include GERD');
    assert(ids.includes('tenke-fungurume'), 'Must include Tenke Fungurume');
    assert(ids.includes('lake-chad'), 'Must include Lake Chad');
    assert(ids.includes('suez-canal'), 'Must include Suez Canal');
    assert(ids.includes('sandton-urban'), 'Must include Sandton');
    assert(ids.includes('lekki-coastal'), 'Must include Lekki');
  });

  console.log('\n--- SECTION 2: BI-TEMPORAL SATELLITE IMAGE DIFFERENCING ---');

  await asyncTest('POST /api/satellite/change/analyze computes optical changes & water metrics (GERD)', async () => {
    const payload = {
      locationName: 'Grand Ethiopian Renaissance Dam (GERD)',
      bbox: [35.05, 11.18, 35.15, 11.26],
      date1: '2025-10-15',
      date2: '2026-10-10',
      sensorType: 'optical',
      enableAiExplanation: true,
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.strictEqual(data.ok, true, 'ok must be true');
    assert.strictEqual(data.location.name, 'Grand Ethiopian Renaissance Dam (GERD)');
    assert(data.scenes.baseline.sceneId.startsWith('S2A_'), 'Baseline scene must be Sentinel-2');
    assert(data.scenes.recent.sceneId.startsWith('S2A_'), 'Recent scene must be Sentinel-2');
    assert.strictEqual(data.scenes.baseline.resolutionMeters, 10.0, 'Resolution must be 10m GSD');
    assert.strictEqual(data.scenes.recent.resolutionMeters, 10.0, 'Resolution must be 10m GSD');
    assert(typeof data.metrics.totalModifiedAreaHectares === 'number', 'Modified hectares must be numeric');
    assert(typeof data.metrics.meanDeltaNdvi === 'number', 'meanDeltaNdvi must be numeric');
    assert(typeof data.metrics.waterSurfaceDeltaHectares === 'number', 'waterSurfaceDeltaHectares must be numeric');
    assert(data.metrics.durationDays > 0, 'durationDays must be positive');
  });

  await asyncTest('POST /api/satellite/change/analyze computes mining excavation benches (Tenke Fungurume)', async () => {
    const payload = {
      locationName: 'Tenke Fungurume Mining Concession',
      bbox: [26.15, -10.65, 26.25, -10.55],
      date1: '2025-10-01',
      date2: '2026-10-05',
      sensorType: 'fused',
      enableAiExplanation: true,
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.strictEqual(data.ok, true, 'ok must be true');
    assert(data.metrics.changeClassification, 'Must have change classification');
    assert(data.metrics.confidenceLevel, 'Must have confidence level');
    assert(Array.isArray(data.rasterVisualization.baselineNdvi), 'Must have baseline raster grid');
    assert(Array.isArray(data.rasterVisualization.differenceNdvi), 'Must have difference raster grid');
    assert.strictEqual(data.rasterVisualization.gridDimension, 32, 'Grid dimension must be 32x32');
  });

  await asyncTest('POST /api/satellite/change/analyze rejects invalid coordinates with helpful diagnostic', async () => {
    const payload = {
      bbox: [50, 10, 40, 20], // minLon > maxLon
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 400, 'Status should be 400');
    const data = await res.json();
    assert.strictEqual(data.ok, false);
    assert(data.error.includes('Invalid geographical bounding box coordinates'), 'Error message must explain invalid bbox');
  });

  console.log('\n--- SECTION 3: GROUNDED AI EXPLANATION & FEATURE FLAG ---');

  await asyncTest('AI Explanation enforces strict 4-tier epistemic structure and physical grounding', async () => {
    const payload = {
      locationName: 'Suez Canal Anchorage',
      bbox: [32.20, 30.50, 32.35, 30.65],
      date1: '2025-10-10',
      date2: '2026-10-12',
      enableAiExplanation: true,
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert(data.aiExplanation, 'aiExplanation must be present');
    assert.strictEqual(data.aiExplanation.enabled, true, 'AI must be enabled');
    assert(data.aiExplanation.evidence.observed.length > 0, 'Must have directly observed facts');
    assert(data.aiExplanation.evidence.detected.length > 0, 'Must have detected findings');
    assert(data.aiExplanation.evidence.uncertainties.length > 0, 'Must include explicit scientific uncertainties');

    // Confirm uncertainty mentions 10m spatial resolution limit
    const uncertText = data.aiExplanation.evidence.uncertainties.join(' ');
    assert(uncertText.includes('10m') || uncertText.includes('resolution'), 'Must articulate 10m physical resolution limit');
  });

  await asyncTest('AI Explanation can be disabled via feature flag without breaking response', async () => {
    const payload = {
      locationName: 'Sandton CBD',
      bbox: [28.04, -26.12, 28.08, -26.08],
      date1: '2025-10-14',
      date2: '2026-10-10',
      enableAiExplanation: false,
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.aiExplanation.enabled, false, 'AI Explanation must be disabled');
    assert(data.metrics.totalModifiedAreaHectares !== undefined, 'Quantitative metrics must remain intact');
  });

  console.log('\n--- SECTION 4: COPERNICUS DATA POLICY & PROVENANCE INTEGRITY ---');

  await asyncTest('Copernicus attribution, licensing, and explicit provenance are strictly enforced', async () => {
    const payload = {
      locationName: 'Lake Chad',
      bbox: [14.40, 12.85, 14.60, 13.05],
      date1: '2025-06-01',
      date2: '2026-10-08',
    };

    const res = await fetch(`${BASE_URL}/api/satellite/change/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert(data.provenance.attribution.includes('Copernicus Sentinel'), 'Attribution must credit Copernicus Sentinel');
    assert(data.provenance.attribution.includes('AFRIQORA'), 'Attribution must note processing by AFRIQORA');
    assert(data.provenance.licensing.includes('1159/2013'), 'Licensing must cite EU Regulation No 1159/2013');
    assert(
      data.provenance.dataSource === 'COPERNICUS_CDSE_LIVE_DOWNLOAD' ||
      data.provenance.dataSource === 'CALIBRATED_BENCHMARK_GRID',
      'Data source must explicitly disclose provenance'
    );
  });

  console.log('\n--- SECTION 5: FRONTEND PRODUCTION BUNDLE & NAVIGATION VERIFICATION ---');

  test('Frontend production build bundle contains Change Intelligence and Copernicus modules', () => {
    const distHtmlPath = 'C:\\Users\\hp\\Documents\\AFRQORA\\frontend\\dist\\index.html';
    assert(fs.existsSync(distHtmlPath), 'frontend/dist/index.html must exist');
    const html = fs.readFileSync(distHtmlPath, 'utf8');
    assert(html.includes('AFRIQORA'), 'Title/meta must contain AFRIQORA');

    // Check compiled JS bundle
    const assetsDir = 'C:\\Users\\hp\\Documents\\AFRQORA\\frontend\\dist\\assets';
    const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    assert(jsFiles.length > 0, 'Compiled JS assets must exist');

    let combinedJs = '';
    for (const f of jsFiles) {
      combinedJs += fs.readFileSync(path.join(assetsDir, f), 'utf8');
    }

    assert(combinedJs.includes('Change Intelligence') || combinedJs.includes('change-intelligence'), 'JS bundle must contain Change Intelligence');
    assert(combinedJs.includes('Copernicus'), 'JS bundle must reference Copernicus');
    assert(combinedJs.includes('NDVI') || combinedJs.includes('Sentinel'), 'JS bundle must contain Sentinel/NDVI processing');
  });

  test('Retired social media and marketplace navigation remain 100% absent', () => {
    const sidebarCode = fs.readFileSync('C:\\Users\\hp\\Documents\\AFRQORA\\frontend\\src\\components\\Sidebar.tsx', 'utf8');
    assert(!sidebarCode.includes("'community'"), 'Community tab must be absent');
    assert(!sidebarCode.includes("'reels'"), 'Reels tab must be absent');
    assert(!sidebarCode.includes("'marketplace'"), 'Marketplace tab must be absent');
    assert(!sidebarCode.includes("'cart'"), 'Cart tab must be absent');
  });

  console.log('\n================================================================');
  console.log(`CHANGE INTELLIGENCE SUITE RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
