const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment from backend/.env
const backendEnvPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else {
  dotenv.config();
}

const { CopernicusCDSEProvider } = require('../backend/dist/modules/satellite/providers/copernicus.provider');
const { Sentinel1SARPipeline } = require('../backend/dist/modules/satellite/pipelines/sentinel1.sar');

async function runStrictCDSEProvenanceAudit() {
  console.log('========================================================================');
  console.log('AFRIQORA ML-01: STRICT PRODUCTION PROVENANCE AUDIT - SENTINEL-1 CDSE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const auditReport = {
    authConfigured: false,
    authPassed: false,
    catalogueOnline: false,
    s1SearchPassed: false,
    assetRetrievalAuthorized: false,
    sarPipelinePassed: false,
    details: [],
    remainingItems: [],
  };

  function logResult(tier, checkName, condition, info = '') {
    if (condition) {
      console.log(`  ✔ [${tier}] ${checkName}`);
      if (info) console.log(`     └─ ${info}`);
      passed++;
      auditReport.details.push({ tier, checkName, status: 'PASS', info });
    } else {
      console.error(`  ✘ [${tier}] FAIL: ${checkName}`);
      if (info) console.error(`     └─ ${info}`);
      failed++;
      auditReport.details.push({ tier, checkName, status: 'FAIL', info });
    }
  }

  // -------------------------------------------------------------------------
  // AUDIT TIER 1: ENVIRONMENT & CREDENTIALS SECURITY HYGIENE
  // -------------------------------------------------------------------------
  console.log('[TIER 1] Validating Secure OAuth2 Credentials Configuration...');

  const hasClientCreds = Boolean(process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET);
  const hasUserCreds = Boolean(process.env.CDSE_USERNAME && process.env.CDSE_PASSWORD);
  const hasAnyCreds = hasClientCreds || hasUserCreds;

  auditReport.authConfigured = hasAnyCreds;

  const authType = hasClientCreds
    ? 'OAuth2 Client Credentials (CDSE_CLIENT_ID / CDSE_CLIENT_SECRET)'
    : hasUserCreds
    ? 'OAuth2 User Credentials (CDSE_USERNAME / CDSE_PASSWORD)'
    : 'NONE (Credentials missing in backend/.env)';

  logResult(
    'Credentials-Audit',
    'Copernicus CDSE OAuth2 Environment Variables Detected',
    hasAnyCreds,
    `Auth Strategy: ${authType}`
  );

  if (!hasAnyCreds) {
    auditReport.remainingItems.push(
      'Configure Copernicus Data Space OAuth2 credentials in backend/.env (either CDSE_CLIENT_ID + CDSE_CLIENT_SECRET or CDSE_USERNAME + CDSE_PASSWORD).'
    );
  }

  // -------------------------------------------------------------------------
  // AUDIT TIER 2: LIVE CDSE ODATA CATALOGUE & NETWORK CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n[TIER 2] Testing Live CDSE OData Catalogue Endpoint...');

  const copernicus = new CopernicusCDSEProvider();
  const health = await copernicus.healthCheck();

  auditReport.catalogueOnline = health.ok;
  logResult(
    'Catalogue-Probe',
    'CDSE OData v1 Catalogue Connectivity Probe',
    health.ok,
    `Status: ${health.status} (Latency: ${health.latencyMs}ms)`
  );

  // -------------------------------------------------------------------------
  // AUDIT TIER 3: OAUTH2 TOKEN EXCHANGE & AUTHENTICATION VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n[TIER 3] Testing CDSE Keycloak OAuth2 Token Negotiation...');

  let token = null;
  let authError = null;

  if (hasAnyCreds) {
    try {
      token = await copernicus.getAccessToken();
      auditReport.authPassed = Boolean(token);
      logResult(
        'OAuth2-Handshake',
        'CDSE Keycloak Bearer Token Retrieval',
        Boolean(token && token.length > 20),
        `Bearer Token Acquired (${token ? token.slice(0, 15) + '...' : 'empty'})`
      );
    } catch (err) {
      authError = err.message;
      auditReport.authPassed = false;
      logResult('OAuth2-Handshake', 'CDSE Keycloak Bearer Token Retrieval', false, err.message);
      auditReport.remainingItems.push(`CDSE OAuth2 Token Exchange Failed: ${err.message}`);
    }
  } else {
    logResult(
      'OAuth2-Handshake',
      'CDSE Keycloak Bearer Token Retrieval',
      false,
      'AUTHENTICATION BLOCKED: No CDSE OAuth2 credentials provided. Mock authentication is prohibited.'
    );
  }

  // -------------------------------------------------------------------------
  // AUDIT TIER 4: GENUINE SENTINEL-1 SAR ASSET SEARCH & METADATA PROVENANCE
  // -------------------------------------------------------------------------
  console.log('\n[TIER 4] Querying Live Sentinel-1 SAR Observations over Target AOI...');

  const tenkeBbox = [26.15, -10.65, 26.25, -10.55]; // Tenke Fungurume DRC AOI
  const searchRange = {
    start: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    end: new Date(),
  };

  const s1Scenes = await copernicus.searchScenes(tenkeBbox, searchRange, 'Sentinel-1A');
  const hasS1 = Array.isArray(s1Scenes) && s1Scenes.length > 0;
  auditReport.s1SearchPassed = hasS1;

  logResult(
    'S1-Catalogue-Search',
    'Sentinel-1 SAR C-Band Scene Query over AOI',
    hasS1,
    `Found ${s1Scenes.length} observation scenes. Sample ID: ${s1Scenes[0]?.id || 'N/A'}`
  );

  // -------------------------------------------------------------------------
  // AUDIT TIER 5: ASSET RETRIEVAL AUTHORIZATION CHECK
  // -------------------------------------------------------------------------
  console.log('\n[TIER 5] Validating Sentinel-1 Asset Download Authorization...');

  if (auditReport.authPassed && token) {
    try {
      const sampleProductId = s1Scenes[0]?.metadata?.productId || s1Scenes[0]?.id;
      const downloadCheckUrl = `https://download.dataspace.copernicus.eu/odata/v1/Products(${sampleProductId})/$value`;
      const dlRes = await fetch(downloadCheckUrl, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'manual',
      });

      const isAuthorized = dlRes.status === 200 || dlRes.status === 301 || dlRes.status === 302 || dlRes.status === 303;
      auditReport.assetRetrievalAuthorized = isAuthorized;

      logResult(
        'Asset-Authorization',
        'CDSE Sentinel-1 Product Download Authorization',
        isAuthorized,
        `HTTP ${dlRes.status} on authenticated download probe`
      );
    } catch (err) {
      logResult('Asset-Authorization', 'CDSE Sentinel-1 Product Download Authorization', false, err.message);
      auditReport.remainingItems.push(`Asset Download Probe Error: ${err.message}`);
    }
  } else {
    logResult(
      'Asset-Authorization',
      'CDSE Sentinel-1 Product Download Authorization',
      false,
      'BLOCKED: CDSE Bearer Token required to access https://download.dataspace.copernicus.eu'
    );
    auditReport.remainingItems.push(
      'Valid CDSE OAuth2 bearer token required for downloading raw Sentinel-1 SAR products.'
    );
  }

  // -------------------------------------------------------------------------
  // AUDIT TIER 6: SENTINEL-1 SAR PIPELINE DECOUPLING & ACCURACY INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n[TIER 6] Validating Sentinel-1 SAR Pipeline Processing Integrity...');

  const dbCalibrated = Sentinel1SARPipeline.calibrateDNtoDecibels(120);
  const dnValid = typeof dbCalibrated === 'number' && !isNaN(dbCalibrated) && dbCalibrated > 40;

  const rawSarGrid = {
    width: 3,
    height: 3,
    resolutionMeters: 10,
    bbox: tenkeBbox,
    data: [
      [-14, -13, -14],
      [-15,  -3, -15],
      [-14, -14, -14],
    ],
  };
  const filteredSar = Sentinel1SARPipeline.applyLeeFilter(rawSarGrid, 3);
  const leeValid = filteredSar.data[1][1] < -3;

  auditReport.sarPipelinePassed = dnValid && leeValid;

  logResult(
    'SAR-Pipeline',
    'Sentinel-1 Radiometric Calibration & Speckle Filtering',
    dnValid && leeValid,
    `DN=120 -> ${dbCalibrated.toFixed(2)} dB | Center filter: -3 dB -> ${filteredSar.data[1][1].toFixed(2)} dB`
  );

  // -------------------------------------------------------------------------
  // AUDIT SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`STRICT PRODUCTION PROVENANCE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================\n');

  if (auditReport.remainingItems.length > 0) {
    console.log('REMAINING AUTHENTICATION / ACCESS ACTIONS:');
    auditReport.remainingItems.forEach((item, idx) => {
      console.log(`  [${idx + 1}] ${item}`);
    });
    console.log('');
  }

  return { passed, failed, auditReport };
}

if (require.main === module) {
  runStrictCDSEProvenanceAudit()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Audit execution error:', err);
      process.exit(1);
    });
}

module.exports = { runStrictCDSEProvenanceAudit };
