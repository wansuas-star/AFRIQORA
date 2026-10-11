const assert = require('assert');
const path = require('path');
const { CopernicusCDSEProvider } = require('../backend/dist/modules/satellite/providers/copernicus.provider');
const { ChangeDetectionEngine } = require('../backend/dist/modules/satellite/ml/changeDetection');
const { Sentinel1SARPipeline } = require('../backend/dist/modules/satellite/pipelines/sentinel1.sar');
const { Sentinel2OpticalPipeline } = require('../backend/dist/modules/satellite/pipelines/sentinel2.optical');

console.log('================================================================');
console.log('AFRIQORA COPERNICUS CDSE OAUTH2 & LIVE DATA INTEGRATION SUITE');
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
  const provider = new CopernicusCDSEProvider();
  const testBbox = [26.15, -10.65, 26.25, -10.55]; // Tenke Fungurume, DRC

  // SECTION 1: OAUTH2 STATUS & SECURE CONFIGURATION
  console.log('--- SECTION 1: OAUTH2 CREDENTIALS & SECURITY INSPECTION ---');

  check('Credential Safety: getAuthStatus does not leak raw passwords or client secrets', () => {
    const status = provider.getAuthStatus();
    assert(typeof status.hasCredentials === 'boolean', 'hasCredentials is boolean');
    assert(['CLIENT_CREDENTIALS', 'PASSWORD', 'NONE'].includes(status.authMethod), 'Valid authMethod');
    assert(status.tokenEndpoint.includes('dataspace.copernicus.eu'), 'Official CDSE Token Endpoint configured');
    assert(status.catalogueEndpoint.includes('dataspace.copernicus.eu'), 'Official CDSE Catalogue Endpoint configured');
    assert(status.downloadEndpoint.includes('dataspace.copernicus.eu'), 'Official CDSE Download Endpoint configured');
    
    // Ensure no secret fields exist in returned status
    assert(!status.clientSecret, 'Never leak client secret');
    assert(!status.password, 'Never leak password');
    if (status.maskedClientId) {
      assert(!status.maskedClientId.includes('SECRET'), 'Masked ID is sanitized');
    }
  });

  await asyncCheck('OAuth2 Token Acquisition Engine: Validates Keycloak endpoint communication', async () => {
    const token = await provider.getAccessToken();
    if (provider.getAuthStatus().hasCredentials) {
      assert(typeof token === 'string' && token.length > 20, 'Acquired valid JWT token');
    } else {
      assert(token === null, 'Graceful null token when unconfigured');
    }
  });

  // SECTION 2: LIVE ODATA SCENE DISCOVERY & CATALOGUE
  console.log('\n--- SECTION 2: LIVE ODATA SCENE DISCOVERY & CATALOGUE ---');

  await asyncCheck('OData Catalogue Search: Discovers Sentinel-1 & Sentinel-2 real granules over AOI', async () => {
    const scenes = await provider.searchScenes(testBbox, {
      start: new Date('2026-09-01'),
      end: new Date('2026-10-01'),
    });

    assert(Array.isArray(scenes) && scenes.length > 0, 'Discovered catalogue scenes');
    const s1 = scenes.find(s => s.platform.startsWith('Sentinel-1'));
    const s2 = scenes.find(s => s.platform.startsWith('Sentinel-2'));

    assert(s1 !== undefined, 'Discovered Sentinel-1 SAR scene');
    assert(s2 !== undefined, 'Discovered Sentinel-2 Optical scene');
    assert(s1.availableBands.includes('VV'), 'Sentinel-1 contains VV band');
    assert(s2.availableBands.includes('B08_NIR'), 'Sentinel-2 contains NIR B08 band');
  });

  await asyncCheck('Product Nodes Inspection: Lists internal GeoTIFF/JP2 band nodes for granules', async () => {
    const nodes = await provider.listProductNodes('S2A_MSIL2A_20260910T082021');
    assert(Array.isArray(nodes), 'Returns product node array');
  });

  // SECTION 3: REAL DATA PROVENANCE VS FALLBACK BENCHMARK SEPARATION
  console.log('\n--- SECTION 3: PROVENANCE INTEGRITY & DATA STREAMING ---');

  await asyncCheck('SAR Scene Fetching: Explicitly sets isRealData & dataSource provenance', async () => {
    const sar = await provider.fetchSARScene('S1A_IW_GRDH_20261001T163210', testBbox);
    assert(sar.sceneId === 'S1A_IW_GRDH_20261001T163210', 'Correct scene ID returned');
    assert(sar.vvGridDb.data.length === 32, 'Valid 32x32 VV grid generated');
    assert(sar.vhGridDb.data.length === 32, 'Valid 32x32 VH grid generated');
    assert(['COPERNICUS_CDSE_LIVE_DOWNLOAD', 'CALIBRATED_BENCHMARK_GRID'].includes(sar.dataSource), 'Valid dataSource flag');
    if (!provider.getAuthStatus().hasCredentials) {
      assert(sar.isRealData === false, 'Fallback is NEVER marked as real data without live auth');
      assert(sar.dataSource === 'CALIBRATED_BENCHMARK_GRID', 'Fallback accurately marked as CALIBRATED_BENCHMARK_GRID');
    }
  });

  await asyncCheck('Optical Scene Fetching: Extracts multi-band grids & indices', async () => {
    const opt = await provider.fetchOpticalScene('S2A_MSIL2A_20261001T082021', testBbox);
    assert(opt.sceneId === 'S2A_MSIL2A_20261001T082021', 'Correct optical scene ID');
    assert(opt.ndviGrid.data.length === 32, 'Valid NDVI grid calculated');
    assert(opt.mndwiGrid.data.length === 32, 'Valid MNDWI grid calculated');
    assert(opt.sclGrid.data.length === 32, 'Valid SCL cloud mask grid');
    if (!provider.getAuthStatus().hasCredentials) {
      assert(opt.isRealData === false, 'Fallback is NEVER marked as real data');
    }
  });

  // SECTION 4: END-TO-END PIPELINE PROCESSING ON REAL/CALIBRATED DATA
  console.log('\n--- SECTION 4: END-TO-END FUSED PROCESSING & TIME-SERIES ---');

  await asyncCheck('End-to-End Processing: SAR + Optical Change Detection & Provenance Passthrough', async () => {
    const bSAR = await provider.fetchSARScene('S1A_IW_GRDH_20260901T163210', testBbox);
    const aSAR = await provider.fetchSARScene('S1A_IW_GRDH_20261001T163210', testBbox);
    const bOpt = await provider.fetchOpticalScene('S2A_MSIL2A_20260901T082021', testBbox);
    const aOpt = await provider.fetchOpticalScene('S2A_MSIL2A_20261001T082021', testBbox);

    const unified = ChangeDetectionEngine.generateUnifiedResult({
      bbox: testBbox,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-10-01'),
      isRealData: false,
      dataSource: 'CALIBRATED_BENCHMARK_GRID',
      provider: 'copernicus_cdse',
      sceneIds: ['S1A_IW_GRDH_20260901T163210', 'S2A_MSIL2A_20261001T082021'],
      actualAcquisitionDates: ['2026-09-01', '2026-09-15', '2026-10-01'],
      beforeSAR: bSAR,
      afterSAR: aSAR,
      beforeOptical: bOpt,
      afterOptical: aOpt,
    });

    assert(unified.provenance.isRealData === false, 'Provenance isRealData matches input');
    assert(unified.provenance.dataSource === 'CALIBRATED_BENCHMARK_GRID', 'Provenance dataSource matches input');
    assert(unified.provenance.sceneIds.length === 2, 'Scene IDs tracked');
    assert(unified.fusedIntelligence !== undefined, 'Fused intelligence calculated');
    assert(unified.timeSeries !== undefined, 'Time-series trajectory computed');
    assert(unified.timeSeries.points.length === 3, 'Time-series has 3 observation points');
  });

  console.log('\n================================================================');
  console.log(`COPERNICUS CDSE SUITE RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
