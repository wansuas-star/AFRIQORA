/**
 * STAGE 3: ISOLATED SQLITE CONCURRENT LOAD TESTING SUITE
 *
 * Strictly executes against a temporary copy of backend/prisma/dev.db in os.tmpdir().
 * Never touches live backend/prisma/dev.db or any of the 4 backups in backend/backups/.
 *
 * Verifies:
 * 1. SQLite WAL & busy_timeout configuration under Prisma singleton client.
 * 2. Concurrency Level 1 (C=10 concurrent operations, 50 total ops: 35 reads, 15 writes).
 * 3. Concurrency Level 2 (C=25 concurrent operations, 100 total ops: 70 reads, 30 writes).
 * 4. Concurrency Level 3 (C=50 concurrent operations, 150 total ops: 120 reads, 30 writes).
 * 5. Atomic transaction commit & rollback integrity (10 concurrent multi-table commits + 5 intentional rollbacks).
 * 6. Zero lost writes (exact row count delta equals total committed writes across all phases).
 * 7. Satellite & Geospatial HTTP API stability under 40 concurrent HTTP requests.
 * 8. Post-load SQLite physical & relational integrity (PRAGMA integrity_check = 'ok', PRAGMA foreign_key_check = 0).
 * 9. Byte-for-byte SHA-256 preservation of live backend/prisma/dev.db and all 4 backups.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const repoRoot = path.resolve(__dirname, '..');
const backendNodeModules = path.join(repoRoot, 'backend', 'node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.unshift(backendNodeModules);
}

const sourceDbPath = path.join(repoRoot, 'backend', 'prisma', 'dev.db');
const backupsDir = path.join(repoRoot, 'backend', 'backups');
const isolatedTestDbPath = path.join(
  os.tmpdir(),
  `afriqora-sqlite-load-isolated-${process.pid}-${Date.now()}.db`
);

if (!fs.existsSync(sourceDbPath)) {
  throw new Error(`Source database not found at ${sourceDbPath}`);
}

fs.copyFileSync(sourceDbPath, isolatedTestDbPath);

process.env.NODE_ENV = 'test';
process.env.AFRIQORA_TEST_ISOLATION = 'true';
process.env.DATABASE_URL = `file:${isolatedTestDbPath.replace(/\\/g, '/')}?connection_limit=1&socket_timeout=10`;

const express = require('express');
const prisma = require('../backend/dist/config/prisma').default;
const satelliteRoutes = require('../backend/dist/modules/satellite/satellite.routes').default;
const searchRoutes = require('../backend/dist/modules/search/search.routes').default;

function computeFileSnapshot(filePath) {
  const stat = fs.statSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return { size: stat.size, mtime: stat.mtime.toISOString(), sha256 };
}

function computeStats(latenciesMs) {
  if (!latenciesMs.length) {
    return { count: 0, min: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const pct = (p) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return Number(sorted[idx].toFixed(2));
  };
  return {
    count: sorted.length,
    min: Number(sorted[0].toFixed(2)),
    mean: Number((sum / sorted.length).toFixed(2)),
    p50: pct(50),
    p95: pct(95),
    p99: pct(99),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

function makeHttpRequest(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method, timeout: 10000 },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          const latencyMs = performance.now() - t0;
          let data = {};
          try {
            data = JSON.parse(raw);
          } catch {
            data = { raw };
          }
          resolve({ status: res.statusCode, data, latencyMs });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function executeWorkloadLevel({
  levelName,
  concurrency,
  totalOps,
  writeRatio,
  seedTargetId,
}) {
  const allLatencies = [];
  const readLatencies = [];
  const writeLatencies = [];
  let completedReads = 0;
  let completedWrites = 0;
  let sqliteBusyErrors = 0;
  let otherErrors = 0;
  let committedTargets = 0;
  let committedObservations = 0;
  let committedReports = 0;

  const tStart = performance.now();
  const waves = Math.ceil(totalOps / concurrency);

  for (let w = 0; w < waves; w++) {
    const waveSize = Math.min(concurrency, totalOps - w * concurrency);
    const tasks = [];

    for (let i = 0; i < waveSize; i++) {
      const opIndex = w * concurrency + i;
      const isWrite = (opIndex % 10) < Math.round(writeRatio * 10);

      if (!isWrite) {
        tasks.push(
          (async () => {
            const t0 = performance.now();
            try {
              const mode = opIndex % 4;
              if (mode === 0) {
                await prisma.satelliteTarget.findMany({
                  take: 10,
                  include: { observations: { take: 2 } },
                });
              } else if (mode === 1) {
                await prisma.intelligenceReport.findMany({
                  take: 10,
                  orderBy: { createdAt: 'desc' },
                });
              } else if (mode === 2) {
                await prisma.satelliteObservation.findMany({
                  where: { targetId: seedTargetId },
                  take: 10,
                });
              } else {
                await prisma.changeAnalysisJob.findMany({
                  take: 10,
                  orderBy: { createdAt: 'desc' },
                });
              }
              const dt = performance.now() - t0;
              allLatencies.push(dt);
              readLatencies.push(dt);
              completedReads++;
            } catch (err) {
              const msg = String(err && err.message ? err.message : err);
              if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked') || msg.includes('timed out')) {
                sqliteBusyErrors++;
              } else {
                otherErrors++;
              }
            }
          })()
        );
      } else {
        tasks.push(
          (async () => {
            const t0 = performance.now();
            try {
              const writeKind = opIndex % 3;
              if (writeKind === 0) {
                await prisma.satelliteTarget.create({
                  data: {
                    name: `LOAD_TARGET_${levelName}_${opIndex}`,
                    category: 'port',
                    country: 'South Africa',
                    bbox: JSON.stringify([32.0, -28.9, 32.2, -28.7]),
                    centerLat: -28.8,
                    centerLon: 32.1,
                    description: `Isolated load test target ${opIndex}`,
                  },
                });
                committedTargets++;
              } else if (writeKind === 1) {
                await prisma.satelliteObservation.create({
                  data: {
                    targetId: seedTargetId,
                    provider: 'aws_stac',
                    platform: 'Sentinel-2A',
                    sensorType: 'OPTICAL_MSI',
                    acquisitionDate: new Date(),
                    cloudCover: 4.2,
                    resolutionMeters: 10.0,
                    bands: JSON.stringify(['B02', 'B03', 'B04', 'B08']),
                    metadata: JSON.stringify({ loadTestLevel: levelName, opIndex }),
                  },
                });
                committedObservations++;
              } else {
                await prisma.intelligenceReport.create({
                  data: {
                    targetId: seedTargetId,
                    userQuery: `Concurrent load verification ${levelName} #${opIndex}`,
                    parsedLocation: 'Port of Richards Bay',
                    parsedTimeWindow: '2026-10-01 to 2026-11-08',
                    parsedAnalysisType: 'port_vessel_activity',
                    writtenAnswer: 'Deterministic satellite telemetry load test record.',
                    observedFacts: JSON.stringify(['Sentinel-1 SAR pass verified']),
                    detectedFindings: JSON.stringify(['Zero lock contention anomalies']),
                    inferredConclusions: JSON.stringify(['Nominal port berth occupancy']),
                    confidenceLevel: 'HIGH',
                    confidenceScore: 0.94,
                    supportingImages: JSON.stringify([]),
                    timelineEvents: JSON.stringify([]),
                  },
                });
                committedReports++;
              }
              const dt = performance.now() - t0;
              allLatencies.push(dt);
              writeLatencies.push(dt);
              completedWrites++;
            } catch (err) {
              const msg = String(err && err.message ? err.message : err);
              if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked') || msg.includes('timed out')) {
                sqliteBusyErrors++;
              } else {
                otherErrors++;
              }
            }
          })()
        );
      }
    }

    await Promise.all(tasks);
  }

  const totalDurationSec = (performance.now() - tStart) / 1000;
  return {
    levelName,
    concurrency,
    totalOps,
    completedReads,
    completedWrites,
    sqliteBusyErrors,
    otherErrors,
    busyRatePct: Number(((sqliteBusyErrors / totalOps) * 100).toFixed(2)),
    totalDurationSec: Number(totalDurationSec.toFixed(3)),
    throughputOpsPerSec: Number((totalOps / totalDurationSec).toFixed(2)),
    writeThroughputPerSec: Number((completedWrites / totalDurationSec).toFixed(2)),
    overallLatency: computeStats(allLatencies),
    readLatency: computeStats(readLatencies),
    writeLatency: computeStats(writeLatencies),
    committedTargets,
    committedObservations,
    committedReports,
  };
}

async function runSuite() {
  console.log('========================================================================');
  console.log('  STAGE 3: ISOLATED SQLITE CONCURRENT LOAD & TRANSACTION INTEGRITY SUITE');
  console.log('========================================================================\n');
  console.log(`  Isolated Temp DB : ${isolatedTestDbPath}`);
  console.log(`  Live DB (Untouched): ${sourceDbPath}\n`);

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

  let server = null;

  try {
    console.log('--- 1. SQLite PRAGMA Configuration & Baseline Counts ---');
    const journalRow = await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    const busyTimeoutRow = await prisma.$queryRawUnsafe('PRAGMA busy_timeout;');
    const syncRow = await prisma.$queryRawUnsafe('PRAGMA synchronous;');

    const journalMode =
      journalRow && journalRow[0] ? Object.values(journalRow[0])[0] : 'unknown';
    const busyTimeoutVal =
      busyTimeoutRow && busyTimeoutRow[0] ? Number(Object.values(busyTimeoutRow[0])[0]) : 0;
    const syncVal =
      syncRow && syncRow[0] ? Number(Object.values(syncRow[0])[0]) : -1;

    check(
      'SQLite journal_mode configured to WAL on isolated database',
      String(journalMode).toLowerCase() === 'wal',
      `journal_mode=${journalMode}`
    );
    check(
      'SQLite busy_timeout configured to 5000ms on isolated database',
      busyTimeoutVal === 5000,
      `busy_timeout=${busyTimeoutVal}ms, synchronous=${syncVal}`
    );

    const initialTargetsCount = await prisma.satelliteTarget.count();
    const initialObservationsCount = await prisma.satelliteObservation.count();
    const initialReportsCount = await prisma.intelligenceReport.count();

    let seedTarget = await prisma.satelliteTarget.findFirst();
    let seedCreated = 0;
    if (!seedTarget) {
      seedTarget = await prisma.satelliteTarget.create({
        data: {
          name: 'SEED_PORT_RICHARDS_BAY',
          category: 'port',
          country: 'South Africa',
          bbox: JSON.stringify([32.01, -28.85, 32.12, -28.75]),
          centerLat: -28.8,
          centerLon: 32.08,
          description: 'Seed target for Stage 3 isolated load test',
        },
      });
      seedCreated = 1;
    }

    console.log(
      `  [INFO] Baseline rows -> SatelliteTarget=${initialTargetsCount + seedCreated}, SatelliteObservation=${initialObservationsCount}, IntelligenceReport=${initialReportsCount}`
    );

    console.log('\n--- 2. Concurrent Read/Write Load Testing (Levels C=10, C=25, C=50) ---');
    const level1 = await executeWorkloadLevel({
      levelName: 'L1_C10',
      concurrency: 10,
      totalOps: 50,
      writeRatio: 0.3,
      seedTargetId: seedTarget.id,
    });
    check(
      'Concurrency Level 1 (C=10, 50 ops: 35 reads / 15 writes) completed with 0 errors',
      level1.sqliteBusyErrors === 0 &&
        level1.otherErrors === 0 &&
        level1.completedReads + level1.completedWrites === 50,
      `p50=${level1.overallLatency.p50}ms, p95=${level1.overallLatency.p95}ms, p99=${level1.overallLatency.p99}ms, throughput=${level1.throughputOpsPerSec} ops/s`
    );

    const level2 = await executeWorkloadLevel({
      levelName: 'L2_C25',
      concurrency: 25,
      totalOps: 100,
      writeRatio: 0.3,
      seedTargetId: seedTarget.id,
    });
    check(
      'Concurrency Level 2 (C=25, 100 ops: 70 reads / 30 writes) completed with 0 errors',
      level2.sqliteBusyErrors === 0 &&
        level2.otherErrors === 0 &&
        level2.completedReads + level2.completedWrites === 100,
      `p50=${level2.overallLatency.p50}ms, p95=${level2.overallLatency.p95}ms, p99=${level2.overallLatency.p99}ms, throughput=${level2.throughputOpsPerSec} ops/s`
    );

    const level3 = await executeWorkloadLevel({
      levelName: 'L3_C50',
      concurrency: 50,
      totalOps: 150,
      writeRatio: 0.2,
      seedTargetId: seedTarget.id,
    });
    check(
      'Concurrency Level 3 (C=50, 150 ops: 120 reads / 30 writes) completed with 0 errors',
      level3.sqliteBusyErrors === 0 &&
        level3.otherErrors === 0 &&
        level3.completedReads + level3.completedWrites === 150,
      `p50=${level3.overallLatency.p50}ms, p95=${level3.overallLatency.p95}ms, p99=${level3.overallLatency.p99}ms, throughput=${level3.throughputOpsPerSec} ops/s`
    );

    check(
      'All concurrency levels stayed strictly within Phase 2 SQLite p95 latency threshold (< 250ms) and busy rate (< 0.5%)',
      level1.overallLatency.p95 < 250 &&
        level2.overallLatency.p95 < 250 &&
        level3.overallLatency.p95 < 250 &&
        level1.busyRatePct === 0 &&
        level2.busyRatePct === 0 &&
        level3.busyRatePct === 0,
      `L1 p95=${level1.overallLatency.p95}ms, L2 p95=${level2.overallLatency.p95}ms, L3 p95=${level3.overallLatency.p95}ms`
    );

    console.log('\n--- 3. Transaction Integrity (Atomic Multi-Table Commit & Intentional Rollback) ---');
    const txCommitCount = 10;
    const txRollbackCount = 5;

    const txCommitPromises = Array.from({ length: txCommitCount }, (_, idx) =>
      prisma.$transaction(async (tx) => {
        const tgt = await tx.satelliteTarget.create({
          data: {
            name: `TX_ATOMIC_COMMIT_TARGET_${idx}`,
            category: 'mining',
            country: 'DRC',
            bbox: JSON.stringify([25.4, -10.7, 25.6, -10.5]),
            centerLat: -10.6,
            centerLon: 25.5,
            description: `Atomic transaction commit test #${idx}`,
          },
        });
        await tx.satelliteObservation.create({
          data: {
            targetId: tgt.id,
            provider: 'copernicus_cdse',
            platform: 'Sentinel-1A',
            sensorType: 'SAR_C_BAND',
            acquisitionDate: new Date(),
            polarization: 'VV+VH',
            orbitDirection: 'ASCENDING',
            resolutionMeters: 10.0,
            bands: JSON.stringify(['VV', 'VH']),
          },
        });
        await tx.intelligenceReport.create({
          data: {
            targetId: tgt.id,
            userQuery: `Atomic TX query #${idx}`,
            parsedLocation: 'Kolwezi Copper Belt, DRC',
            parsedTimeWindow: '2026-11',
            parsedAnalysisType: 'mining_expansion',
            writtenAnswer: 'Atomic transaction verification report.',
            observedFacts: JSON.stringify(['SAR backscatter delta measured']),
            detectedFindings: JSON.stringify(['Excavation bench expansion']),
            inferredConclusions: JSON.stringify(['Active open-pit operations']),
            confidenceLevel: 'HIGH',
            confidenceScore: 0.96,
            supportingImages: JSON.stringify([]),
            timelineEvents: JSON.stringify([]),
          },
        });
        return tgt.id;
      })
    );

    let rolledBackCount = 0;
    const txRollbackPromises = Array.from({ length: txRollbackCount }, (_, idx) =>
      prisma
        .$transaction(async (tx) => {
          await tx.satelliteTarget.create({
            data: {
              name: `TX_SHOULD_ROLLBACK_TARGET_${idx}`,
              category: 'infrastructure',
              country: 'DRC',
              bbox: JSON.stringify([29.1, -1.7, 29.3, -1.5]),
              centerLat: -1.6,
              centerLon: 29.2,
              description: 'This record must be rolled back atomically',
            },
          });
          throw new Error(`INTENTIONAL_TX_ABORT_${idx}`);
        })
        .catch((err) => {
          if (String(err.message).startsWith('INTENTIONAL_TX_ABORT_')) {
            rolledBackCount++;
          } else {
            throw err;
          }
        })
    );

    const [committedTxIds] = await Promise.all([
      Promise.all(txCommitPromises),
      Promise.all(txRollbackPromises),
    ]);

    const leakedRollbackTargets = await prisma.satelliteTarget.count({
      where: { name: { startsWith: 'TX_SHOULD_ROLLBACK_TARGET_' } },
    });

    check(
      '10 concurrent multi-table transactions committed atomically (30 rows written)',
      committedTxIds.length === txCommitCount,
      `committedTransactions=${committedTxIds.length}`
    );
    check(
      '5 concurrent failing transactions rolled back cleanly with 0 partial/orphaned rows',
      rolledBackCount === txRollbackCount && leakedRollbackTargets === 0,
      `rolledBack=${rolledBackCount}, leakedRows=${leakedRollbackTargets}`
    );

    console.log('\n--- 4. Zero Lost Writes Verification ---');
    const expectedTargetsDelta =
      seedCreated +
      level1.committedTargets +
      level2.committedTargets +
      level3.committedTargets +
      txCommitCount;
    const expectedObservationsDelta =
      level1.committedObservations +
      level2.committedObservations +
      level3.committedObservations +
      txCommitCount;
    const expectedReportsDelta =
      level1.committedReports +
      level2.committedReports +
      level3.committedReports +
      txCommitCount;

    const finalTargetsCount = await prisma.satelliteTarget.count();
    const finalObservationsCount = await prisma.satelliteObservation.count();
    const finalReportsCount = await prisma.intelligenceReport.count();

    const actualTargetsDelta = finalTargetsCount - initialTargetsCount;
    const actualObservationsDelta = finalObservationsCount - initialObservationsCount;
    const actualReportsDelta = finalReportsCount - initialReportsCount;

    check(
      'SatelliteTarget row count matches exact committed writes (0 lost writes)',
      actualTargetsDelta === expectedTargetsDelta,
      `expected=+${expectedTargetsDelta}, actual=+${actualTargetsDelta} (total=${finalTargetsCount})`
    );
    check(
      'SatelliteObservation row count matches exact committed writes (0 lost writes)',
      actualObservationsDelta === expectedObservationsDelta,
      `expected=+${expectedObservationsDelta}, actual=+${actualObservationsDelta} (total=${finalObservationsCount})`
    );
    check(
      'IntelligenceReport row count matches exact committed writes (0 lost writes)',
      actualReportsDelta === expectedReportsDelta,
      `expected=+${expectedReportsDelta}, actual=+${actualReportsDelta} (total=${finalReportsCount})`
    );

    console.log('\n--- 5. Satellite & Geospatial HTTP Endpoints Under Concurrent Load ---');
    const app = express();
    app.use(express.json());
    app.use('/api/satellite', satelliteRoutes);
    app.use('/api/search', searchRoutes);

    let port = 0;
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    const httpEndpoints = [
      '/api/satellite/status',
      '/api/satellite/targets',
      '/api/satellite/reports',
      '/api/satellite/vessels?portId=port-richards-bay',
      '/api/satellite/maritime/regions',
      '/api/satellite/maritime/ports',
      '/api/satellite/change/presets',
      '/api/search?q=richards%20bay&type=satellite',
    ];

    const httpRequests = [];
    for (let i = 0; i < 40; i++) {
      const ep = httpEndpoints[i % httpEndpoints.length];
      httpRequests.push(makeHttpRequest(port, 'GET', ep));
    }

    const httpResponses = await Promise.all(httpRequests);
    const httpStats = computeStats(httpResponses.map((r) => r.latencyMs));
    const allHttp200 = httpResponses.every((r) => r.status === 200);

    check(
      '40 concurrent HTTP requests across 8 satellite & geospatial search endpoints returned HTTP 200 OK',
      allHttp200,
      `200_OK=${httpResponses.filter((r) => r.status === 200).length}/40, p50=${httpStats.p50}ms, p95=${httpStats.p95}ms, p99=${httpStats.p99}ms`
    );

    console.log('\n--- 6. Post-Load SQLite Database Physical & Foreign-Key Integrity ---');
    const integrityCheckRows = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
    const fkCheckRows = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check;');
    const integrityStatus =
      integrityCheckRows && integrityCheckRows[0]
        ? Object.values(integrityCheckRows[0])[0]
        : 'failed';

    check(
      'PRAGMA integrity_check returned "ok" (0 corrupted pages or B-tree indices)',
      integrityStatus === 'ok',
      `integrity_check=${integrityStatus}`
    );
    check(
      'PRAGMA foreign_key_check returned 0 violations',
      Array.isArray(fkCheckRows) && fkCheckRows.length === 0,
      `violations=${Array.isArray(fkCheckRows) ? fkCheckRows.length : 'error'}`
    );

    console.log('\n--- 7. Structured Performance Summary Table ---');
    console.log(
      JSON.stringify(
        {
          levels: [level1, level2, level3],
          httpConcurrentLoad: {
            totalRequests: 40,
            endpointsTested: httpEndpoints.length,
            status200Count: httpResponses.filter((r) => r.status === 200).length,
            latencyMs: httpStats,
          },
          transactions: {
            concurrentMultiTableCommits: txCommitCount,
            concurrentIntentionalRollbacks: txRollbackCount,
            leakedPartialRows: leakedRollbackTargets,
          },
          writeVerification: {
            targetsDelta: { expected: expectedTargetsDelta, actual: actualTargetsDelta },
            observationsDelta: { expected: expectedObservationsDelta, actual: actualObservationsDelta },
            reportsDelta: { expected: expectedReportsDelta, actual: actualReportsDelta },
          },
        },
        null,
        2
      )
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      const candidate = `${isolatedTestDbPath}${suffix}`;
      if (fs.existsSync(candidate)) {
        try {
          fs.unlinkSync(candidate);
        } catch {
          // ignore cleanup lock if any
        }
      }
    }
  }

  console.log('\n--- 8. Live Database & 4 Backups Preservation Check ---');
  const postLiveSnapshot = computeFileSnapshot(sourceDbPath);
  check(
    'Live backend/prisma/dev.db is 100% untouched (size, mtime, SHA-256 identical)',
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
  check(
    'All 4 backups in backend/backups/ are 100% untouched (size, mtime, SHA-256 identical)',
    backupsUnchanged,
    `verifiedBackups=${backupFiles.length}`
  );

  console.log(`\n========================================================================`);
  console.log(`  STAGE 3 SUMMARY: ${passed} PASSED, ${failed} FAILED, 0 SKIPPED`);
  console.log(`========================================================================`);
  if (failed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});

