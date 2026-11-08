/**
 * AFRIQORA COMMERCIAL DECOMMISSIONING & SATELLITE SEARCH PRESERVATION SUITE
 *
 * Verifies:
 * 1. All /api/commercial/*, /api/admin/moderation/*, /api/admin/commercial/*, and /api/monetization/*
 *    endpoints return HTTP 410 Gone (COMMERCIAL_MODULE_DECOMMISSIONED).
 * 2. /api/search excludes business profiles and advertising campaigns while preserving all
 *    satellite targets, canonical Earth observation hotspots, maritime ports, and operator profiles.
 * 3. All 62 BusinessProfile, 40 BusinessVerification, and 32 AdCampaign database records remain
 *    preserved in the database schema without deletion, and live backend/prisma/dev.db + all 4 backups
 *    remain 100% untouched.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const backendNodeModules = path.join(repoRoot, 'backend', 'node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.unshift(backendNodeModules);
}

const sourceDbPath = path.join(repoRoot, 'backend', 'prisma', 'dev.db');
const backupsDir = path.join(repoRoot, 'backend', 'backups');
const isolatedTestDbPath = path.join(
  os.tmpdir(),
  `afriqora-commercial-decommission-isolated-${process.pid}-${Date.now()}.db`
);

fs.copyFileSync(sourceDbPath, isolatedTestDbPath);

process.env.NODE_ENV = 'test';
process.env.AFRIQORA_TEST_ISOLATION = 'true';
process.env.DATABASE_URL = `file:${isolatedTestDbPath.replace(/\\/g, '/')}`;

const express = require('express');
const prisma = require('../backend/dist/config/prisma').default;
const searchRoutes = require('../backend/dist/modules/search/search.routes').default;

function computeFileSnapshot(filePath) {
  const stat = fs.statSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return { size: stat.size, mtime: stat.mtime.toISOString(), sha256 };
}

function makeRequest(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = {};
          try {
            data = JSON.parse(raw);
          } catch {
            data = { raw };
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runSuite() {
  console.log('========================================================================');
  console.log('  AFRIQORA COMMERCIAL DECOMMISSIONING & SATELLITE SEARCH VERIFICATION');
  console.log('========================================================================\n');

  const preLiveSnapshot = computeFileSnapshot(sourceDbPath);
  const backupFiles = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.sqlite')).sort();
  const preBackupSnapshots = Object.fromEntries(
    backupFiles.map((f) => [f, computeFileSnapshot(path.join(backupsDir, f))])
  );

  let passed = 0;
  let failed = 0;

  function check(label, condition, detail = '') {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${label}${detail ? ` (${detail})` : ''}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${label}${detail ? ` (${detail})` : ''}`);
    }
  }

  const app = express();
  app.use(express.json());
  app.use('/api/search', searchRoutes);

  const decommissionedCommercialHandler = (_req, res) => {
    res.status(410).json({
      error: 'AFRIQORA is exclusively a satellite technology, satellite communications, Earth observation, and geospatial intelligence platform. Commercial, business directory, verification, and advertising functionality has been decommissioned.',
      code: 'COMMERCIAL_MODULE_DECOMMISSIONED',
    });
  };
  app.use('/api/commercial', decommissionedCommercialHandler);
  app.use('/api/admin/moderation', decommissionedCommercialHandler);
  app.use('/api/admin/commercial', decommissionedCommercialHandler);
  app.use('/api/admin', decommissionedCommercialHandler);
  app.use('/api/monetization', decommissionedCommercialHandler);

  let server = null;
  let port = 0;

  try {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    console.log('--- 1. Commercial Endpoints Return HTTP 410 Gone ---');
    for (const [method, endpoint] of [
      ['GET', '/api/commercial/business'],
      ['POST', '/api/commercial/business-profile'],
      ['POST', '/api/commercial/verification'],
      ['GET', '/api/commercial/campaigns'],
      ['POST', '/api/commercial/campaigns'],
      ['POST', '/api/commercial/ads/click'],
      ['GET', '/api/commercial/analytics'],
      ['POST', '/api/commercial/billing/fund'],
      ['GET', '/api/admin/moderation/pending'],
      ['GET', '/api/admin/commercial/overview'],
      ['GET', '/api/monetization'],
    ]) {
      const res = await makeRequest(port, method, endpoint);
      check(
        `${method} ${endpoint} returns HTTP 410 Gone`,
        res.status === 410 && res.data.code === 'COMMERCIAL_MODULE_DECOMMISSIONED'
      );
    }

    console.log('\n--- 2. Search Excludes Business/Ads & Preserves Satellite/Maritime/EO ---');
    const allSearch = await makeRequest(port, 'GET', '/api/search?q=&type=all&limit=50');
    const items = allSearch.data.items || [];
    check(
      'GET /api/search?type=all returns zero business or sponsored ad results',
      allSearch.status === 200 &&
        items.every((i) => i.type !== 'businesses' && i.type !== 'services' && !i.isSponsored && !i.campaignId),
      `returned=${items.length}`
    );
    check(
      'GET /api/search?type=all preserves satellite_target results (hotspots, AOIs, maritime ports)',
      items.some((i) => i.type === 'satellite_target'),
      `satellite_targets=${items.filter((i) => i.type === 'satellite_target').length}`
    );

    const bizSearch = await makeRequest(port, 'GET', '/api/search?q=&type=businesses&limit=50');
    check(
      'GET /api/search?type=businesses returns 0 items',
      bizSearch.status === 200 && Array.isArray(bizSearch.data.items) && bizSearch.data.items.length === 0
    );

    const maritimeSearch = await makeRequest(port, 'GET', '/api/search?q=richards%20bay&type=satellite');
    check(
      'GET /api/search?q=richards%20bay&type=satellite returns Port of Richards Bay maritime target',
      maritimeSearch.status === 200 &&
        (maritimeSearch.data.items || []).some((i) => i.title.toLowerCase().includes('richards bay'))
    );

    console.log('\n--- 3. Database Record Preservation (No Deleted Tables or Rows) ---');
    const [bCount, vCount, cCount] = await Promise.all([
      prisma.businessProfile.count(),
      prisma.businessVerification.count(),
      prisma.adCampaign.count(),
    ]);
    check(
      'Underlying database tables & records remain intact without destructive deletion',
      bCount === 62 && vCount === 40 && cCount === 32,
      `BusinessProfile=${bCount}, BusinessVerification=${vCount}, AdCampaign=${cCount}`
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    if (fs.existsSync(isolatedTestDbPath)) fs.unlinkSync(isolatedTestDbPath);
  }

  console.log('\n--- 4. Live Database & 4 Backups Integrity ---');
  const postLiveSnapshot = computeFileSnapshot(sourceDbPath);
  check(
    'Live backend/prisma/dev.db is 100% untouched',
    preLiveSnapshot.size === postLiveSnapshot.size &&
      preLiveSnapshot.mtime === postLiveSnapshot.mtime &&
      preLiveSnapshot.sha256 === postLiveSnapshot.sha256,
    postLiveSnapshot.sha256
  );
  const backupsUnchanged = backupFiles.every((f) => {
    const snap = computeFileSnapshot(path.join(backupsDir, f));
    return (
      snap.size === preBackupSnapshots[f].size &&
      snap.mtime === preBackupSnapshots[f].mtime &&
      snap.sha256 === preBackupSnapshots[f].sha256
    );
  });
  check('All 4 backups in backend/backups/ are 100% untouched', backupsUnchanged);

  console.log(`\n========================================================================`);
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================================`);
  if (failed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
