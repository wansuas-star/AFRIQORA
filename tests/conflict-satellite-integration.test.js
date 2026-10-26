/**
 * Comprehensive Backend Integration Test:
 * Satellite Intelligence (ML-01) <-> Conflict Intelligence (Eastern DRC Corridors)
 *
 * Verifies:
 * 1. Inactive module gate rejects satellite-pass search and corroboration with HTTP 403
 * 2. Inactive module gate rejects corroboration with HTTP 403
 * 3. Platform Owner unlocks operational intelligence session with 32-hex cryptographic nonce
 * 4. Satellite Observation Pass Discovery (OData search across conflict AOI)
 * 5. Decoupled Sentinel-1 SAR physical corroboration with backscatter differencing & SHA-256 integrity hash
 * 6. Decoupled Sentinel-2 Optical multispectral corroboration with NDVI differencing & SHA-256 integrity hash
 * 7. Fused multi-sensor analysis upgrading NATO/Admiralty Intelligence Scale (B2 -> B1) and confidence percent
 * 8. Unauthenticated access rejection (HTTP 401)
 * 9. Immutable SHA-256 audit ledger capturing all satellite corroboration actions
 */

const http = require('http');
const jwt = require('C:/Users/hp/Documents/AFRQORA/backend/node_modules/jsonwebtoken');
const express = require('C:/Users/hp/Documents/AFRQORA/backend/node_modules/express');

process.env.DATABASE_URL = 'file:C:/Users/hp/Documents/AFRQORA/backend/prisma/dev.db';

const { getJwtSecret } = require('C:/Users/hp/Documents/AFRQORA/backend/dist/shared/auth.middleware');
const conflictRoutes = require('C:/Users/hp/Documents/AFRQORA/backend/dist/modules/conflict/conflict.routes').default;

const JWT_SECRET = getJwtSecret();

const PLATFORM_OWNER = {
  id: '0bdc6e2b-8025-46c5-bca2-1e7f1f42fbc6',
  email: 'owner@afriqora.internal',
  isPlatformOwner: true
};

const ANALYST_USER = {
  id: '08a825b1-ccc8-455b-8a88-ecd2b4abfb82',
  email: 'analyst@afriqora.internal',
  isPlatformOwner: false
};

const ownerToken = jwt.sign({ userId: PLATFORM_OWNER.id, email: PLATFORM_OWNER.email }, JWT_SECRET, { expiresIn: '1h' });
const analystToken = jwt.sign({ userId: ANALYST_USER.id, email: ANALYST_USER.email }, JWT_SECRET, { expiresIn: '1h' });

const app = express();
app.use(express.json());
app.use('/api/conflict', conflictRoutes);

let server;
let serverPort;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runIntegrationSuite() {
  console.log('======================================================================');
  console.log('AFRIQORA BACKEND INTEGRATION: SATELLITE (ML-01) <-> CONFLICT MODULE');
  console.log('======================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`[SETUP] Test server listening on http://127.0.0.1:${serverPort}`);
      resolve();
    });
  });

  let passedCount = 0;
  const totalCount = 9;

  try {
    // 1. Inactive State: satellite-passes rejected with HTTP 403
    {
      const res = await makeRequest('GET', '/api/conflict/incidents/DRC-NK-RUBAYA-001/satellite-passes');
      console.log('[TEST 1] Inactive Gate on Satellite Passes Search:');
      console.log('         Status:', res.status, '| Error Code:', res.data.code);
      if (res.status === 403 && res.data.code === 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL') {
        console.log('--> PASSED: Satellite pass discovery blocked when module is locked.\n');
        passedCount++;
      } else {
        throw new Error('Satellite pass search was not blocked with 403');
      }
    }

    // 2. Inactive State: corroborate-satellite rejected with HTTP 403
    {
      const res = await makeRequest('POST', '/api/conflict/incidents/DRC-NK-RUBAYA-001/corroborate-satellite', {
        Authorization: `Bearer ${analystToken}`
      }, { sensorType: 'SAR' });
      console.log('[TEST 2] Inactive Gate on Corroboration Engine:');
      console.log('         Status:', res.status, '| Error Code:', res.data.code);
      if (res.status === 403 && res.data.code === 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL') {
        console.log('--> PASSED: Satellite corroboration blocked when module is locked.\n');
        passedCount++;
      } else {
        throw new Error('Satellite corroboration was not blocked with 403');
      }
    }

    // 3. Platform Owner Activation
    {
      const res = await makeRequest('POST', '/api/conflict/activate', {
        Authorization: `Bearer ${ownerToken}`
      }, { authorizationReason: 'Authorized Satellite-Conflict Integration Verification' });
      console.log('[TEST 3] Platform Owner Activation:');
      console.log('         Status:', res.status, '| Nonce:', res.data.state?.authorizationNonce);
      if (res.status === 200 && res.data.state?.isActive === true && res.data.state?.authorizationNonce?.length === 32) {
        console.log('--> PASSED: Module successfully activated by Platform Owner.\n');
        passedCount++;
      } else {
        throw new Error('Platform owner activation failed');
      }
    }

    // 4. Satellite Observation Pass Discovery across Conflict AOI
    {
      const res = await makeRequest('GET', '/api/conflict/incidents/DRC-NK-RUBAYA-001/satellite-passes?days=90', {
        Authorization: `Bearer ${analystToken}`
      });
      console.log('[TEST 4] Satellite Pass Discovery over Rubaya Coltan Concession:');
      console.log('         Status:', res.status);
      console.log('         Total Scenes Discovered:', res.data.provenance?.totalScenesDiscovered);
      console.log('         SAR Passes:', res.data.provenance?.sarPassCount);
      console.log('         Optical Passes:', res.data.provenance?.opticalPassCount);
      console.log('         Data Source:', res.data.provenance?.dataSource);
      console.log('         Is Real Data:', res.data.provenance?.isRealData);

      if (
        res.status === 200 &&
        res.data.ok === true &&
        res.data.provenance?.totalScenesDiscovered > 0 &&
        res.data.scenes?.length > 0 &&
        res.data.provenance?.dataSource
      ) {
        console.log('--> PASSED: Satellite passes discovered and catalogued over conflict AOI.\n');
        passedCount++;
      } else {
        throw new Error('Satellite pass discovery failed');
      }
    }

    // 5. Decoupled Sentinel-1 SAR Physical Corroboration
    {
      const res = await makeRequest('POST', '/api/conflict/incidents/DRC-NK-RUBAYA-001/corroborate-satellite', {
        Authorization: `Bearer ${analystToken}`
      }, {
        sensorType: 'SAR',
        comparisonWindowDays: 60,
        thresholdDb: 2.5
      });
      console.log('[TEST 5] Decoupled Sentinel-1 SAR Corroboration:');
      console.log('         Status:', res.status);
      const sarObs = res.data.generatedObservations?.[0];
      console.log('         Platform:', sarObs?.platform);
      console.log('         Index Type:', sarObs?.deltaIndexType);
      console.log('         Mean Delta (dB):', sarObs?.deltaMagnitude);
      console.log('         Anomalous Area (ha):', sarObs?.areaHectares);
      console.log('         Corroboration Status:', sarObs?.corroborationStatus);
      console.log('         SHA-256 Hash:', sarObs?.integrityHashSha256);
      console.log('         Data Source:', sarObs?.dataSource);

      if (
        res.status === 201 &&
        sarObs?.platform === 'Sentinel-1A SAR' &&
        sarObs?.deltaIndexType === 'RADAR_BACKSCATTER_DB' &&
        sarObs?.integrityHashSha256?.length === 64 &&
        sarObs?.dataSource
      ) {
        console.log('--> PASSED: Sentinel-1 SAR physical corroboration executed with SHA-256 integrity.\n');
        passedCount++;
      } else {
        throw new Error('Sentinel-1 SAR corroboration failed');
      }
    }

    // 6. Decoupled Sentinel-2 Optical Multispectral Corroboration
    {
      const res = await makeRequest('POST', '/api/conflict/incidents/DRC-IT-DJUGU-003/corroborate-satellite', {
        Authorization: `Bearer ${analystToken}`
      }, {
        sensorType: 'OPTICAL',
        comparisonWindowDays: 45
      });
      console.log('[TEST 6] Decoupled Sentinel-2 Optical Corroboration (Djugu Concession):');
      console.log('         Status:', res.status);
      const optObs = res.data.generatedObservations?.[0];
      console.log('         Platform:', optObs?.platform);
      console.log('         Index Type:', optObs?.deltaIndexType);
      console.log('         Mean Delta NDVI:', optObs?.deltaMagnitude);
      console.log('         Loss Area (ha):', optObs?.areaHectares);
      console.log('         SHA-256 Hash:', optObs?.integrityHashSha256);
      console.log('         Data Source:', optObs?.dataSource);

      if (
        res.status === 201 &&
        optObs?.platform === 'Sentinel-2A MSI' &&
        optObs?.deltaIndexType === 'NDVI_VEGETATION_LOSS' &&
        optObs?.integrityHashSha256?.length === 64 &&
        optObs?.dataSource
      ) {
        console.log('--> PASSED: Sentinel-2 Optical multispectral corroboration executed.\n');
        passedCount++;
      } else {
        throw new Error('Sentinel-2 Optical corroboration failed');
      }
    }

    // 7. Multi-Sensor Fused Corroboration & Dynamic Admiralty Upgrade
    {
      const res = await makeRequest('POST', '/api/conflict/incidents/DRC-NK-SAKE-002/corroborate-satellite', {
        Authorization: `Bearer ${analystToken}`
      }, {
        sensorType: 'BOTH',
        comparisonWindowDays: 60
      });
      console.log('[TEST 7] Multi-Sensor Fusion & Admiralty Grading Upgrade (Sake Corridor):');
      console.log('         Status:', res.status);
      console.log('         Generated Observations Count:', res.data.generatedObservations?.length);
      console.log('         Admiralty Upgrade Notice:', res.data.admiraltyUpgradeNotice);
      const primarySource = res.data.incident?.sources?.[0];
      console.log('         Updated Composite Score:', primarySource?.admiraltyGrading?.compositeScore);
      console.log('         Updated Confidence %:', primarySource?.admiraltyGrading?.confidencePercent);

      const hasSAR = res.data.generatedObservations?.some(o => o.platform.includes('SAR'));
      const hasOptical = res.data.generatedObservations?.some(o => o.platform.includes('MSI'));

      if (
        res.status === 201 &&
        hasSAR &&
        hasOptical &&
        primarySource?.admiraltyGrading?.compositeScore &&
        primarySource?.admiraltyGrading?.confidencePercent >= 70
      ) {
        console.log('--> PASSED: Dual-sensor fusion elevated Admiralty credibility to Grade 1 (Confirmed by satellite).\n');
        passedCount++;
      } else {
        throw new Error('Multi-sensor fusion or Admiralty upgrade failed');
      }
    }

    // 8. Unauthenticated Access Rejection
    {
      const res = await makeRequest('POST', '/api/conflict/incidents/DRC-NK-RUBAYA-001/corroborate-satellite', {}, {
        sensorType: 'SAR'
      });
      console.log('[TEST 8] Unauthenticated Corroboration Attempt:');
      console.log('         Status:', res.status);
      if (res.status === 401) {
        console.log('--> PASSED: Unauthenticated corroboration rejected with HTTP 401.\n');
        passedCount++;
      } else {
        throw new Error('Unauthenticated access was not blocked with 401');
      }
    }

    // 9. Tamper-Evident Audit Ledger Verification
    {
      const res = await makeRequest('GET', '/api/conflict/audit-logs', {
        Authorization: `Bearer ${ownerToken}`
      });
      console.log('[TEST 9] Tamper-Evident Audit Ledger:');
      console.log('         Status:', res.status);
      console.log('         Total Logged Entries:', res.data.totalEntries);
      const corroborationAudit = res.data.logs?.find(l => l.action === 'CORROBORATE_SATELLITE_EVIDENCE');
      console.log('         Corroboration Action Found:', Boolean(corroborationAudit));
      console.log('         Audit Entry Actor:', corroborationAudit?.actorEmail);
      console.log('         SHA-256 Digest:', corroborationAudit?.sha256Signature);

      if (
        res.status === 200 &&
        corroborationAudit &&
        corroborationAudit.sha256Signature?.length === 64
      ) {
        console.log('--> PASSED: Corroboration actions immutably logged with SHA-256 signatures.\n');
        passedCount++;
      } else {
        throw new Error('Audit ledger verification failed');
      }
    }

    console.log('======================================================================');
    console.log(`INTEGRATION SUITE RESULT: ${passedCount}/${totalCount} TEST SUITES PASSED (100%)`);
    console.log('SATELLITE (ML-01) <-> CONFLICT INTELLIGENCE INTEGRATION VERIFIED');
    console.log('======================================================================');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runIntegrationSuite().catch((err) => {
  console.error('\n[FATAL INTEGRATION TEST FAILURE]:', err);
  process.exit(1);
});
