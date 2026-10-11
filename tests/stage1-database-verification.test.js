const assert = require('assert');
const crypto = require('crypto');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

console.log('================================================================');
console.log('AFRIQORA STAGE 1: GOVERNMENT DATABASE EXTENSION VERIFICATION');
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
  console.log('--- SECTION 1: PRESERVATION OF EXISTING 20 TABLES & RECORDS ---');
  
  const expectedPreCounts = {
    User: 84,
    ConnectionRequest: 16,
    BusinessProfile: 42,
    Notification: 16,
    AdCampaign: 22,
    AdEventNonce: 20,
    MerchantTransaction: 19,
    BusinessVerification: 22,
    IntelligenceReport: 33,
  };

  for (const [table, expectedCount] of Object.entries(expectedPreCounts)) {
    await asyncCheck(`Preservation: ${table} table retains exactly ${expectedCount} records`, async () => {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = Number(res[0].count);
      if (table === 'IntelligenceReport') {
        assert(count >= expectedCount, `Expected at least ${expectedCount} in ${table}, but found ${count}`);
      } else {
        assert.strictEqual(count, expectedCount, `Expected ${expectedCount} in ${table}, but found ${count}`);
      }
    });
  }

  console.log('\n--- SECTION 2: NEW 10 GOVERNMENT SCHEMA TABLES EXISTENCE ---');
  
  const newTables = [
    'GovernmentAgency',
    'GovernmentOfficer',
    'InvestigationCase',
    'CaseOfficerAccess',
    'AuthorizedIntegration',
    'InvestigationEvidence',
    'EvidenceChainOfCustody',
    'DerivedArtifact',
    'InvestigationReport',
    'GovernmentAuditLog',
  ];

  for (const table of newTables) {
    await asyncCheck(`New Model Table: "${table}" exists in SQLite schema`, async () => {
      const res = await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      );
      assert(res.length > 0, `Table ${table} was not created in SQLite`);
    });
  }

  console.log('\n--- SECTION 3: DATABASE INTEGRITY & FOREIGN KEY CONSTRAINTS ---');

  await asyncCheck('SQLite PRAGMA integrity_check returns ok', async () => {
    const res = await prisma.$queryRawUnsafe('PRAGMA integrity_check');
    assert(res && res[0] && res[0].integrity_check === 'ok', 'Database integrity check failed');
  });

  await asyncCheck('SQLite PRAGMA foreign_key_check returns 0 violations', async () => {
    const res = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check');
    assert.strictEqual(res.length, 0, `Foreign key violations detected: ${JSON.stringify(res)}`);
  });

  console.log('\n--- SECTION 4: CRUD & CRYPTOGRAPHIC HASH CHAINING INGEST TEST ---');

  let testAgencyId = null;
  let testOfficerId = null;
  let testCaseId = null;
  let testEvidenceId = null;
  let testLogId = null;

  await asyncCheck('Create Government Agency, Officer, Case & Tamper-Evident Audit Log', async () => {
    // 1. Create Agency
    const agency = await prisma.governmentAgency.create({
      data: {
        code: 'TEST-SAPS-DPCI-' + Date.now(),
        name: 'Directorate for Priority Crime Investigation (Test)',
        country: 'South Africa',
        jurisdiction: 'National',
        retentionDays: 1825,
      },
    });
    testAgencyId = agency.id;
    assert(agency.id, 'Agency created');

    // 2. Fetch existing user for link
    const existingUser = await prisma.user.findFirst({ where: { governmentOfficer: null } });
    assert(existingUser, 'Existing user found for test officer link');

    // 3. Create Officer
    const officer = await prisma.governmentOfficer.create({
      data: {
        userId: existingUser.id,
        agencyId: agency.id,
        badgeNumber: 'BADGE-' + Date.now(),
        rank: 'Chief Investigative Officer',
        role: 'SENIOR_INVESTIGATOR',
        clearanceLevel: 'RESTRICTED',
      },
    });
    testOfficerId = officer.id;
    assert(officer.id, 'Officer created');

    // 4. Create Investigation Case
    const invCase = await prisma.investigationCase.create({
      data: {
        caseNumber: 'TEST-AFRIQORA-INV-' + Date.now(),
        agencyId: agency.id,
        leadOfficerId: officer.id,
        title: 'Infrastructure Integrity Verification Case',
        investigationType: 'serious_crime',
        classification: 'CONFIDENTIAL',
        status: 'OPEN',
        incidentLocation: 'Johannesburg CBD',
        incidentLat: -26.2041,
        incidentLon: 28.0473,
        timeRangeStart: new Date('2026-10-01'),
        timeRangeEnd: new Date('2026-10-10'),
        legalMandateRef: 'CPA-SEC-205-REF-9921',
      },
    });
    testCaseId = invCase.id;
    assert(invCase.id, 'Investigation Case created');

    // 5. Ingest Evidence with SHA-256 Hash
    const samplePayload = Buffer.from('TEST CCTV RECORDING BITSTREAM 2026');
    const sha256 = crypto.createHash('sha256').update(samplePayload).digest('hex');

    const evidence = await prisma.investigationEvidence.create({
      data: {
        caseId: invCase.id,
        officerId: officer.id,
        sourceType: 'CCTV_FOOTAGE',
        sourceName: 'CAM-JHB-CBD-012',
        sourceOrganization: 'Johannesburg Metro Police',
        acquisitionMethod: 'AUTHORIZED_CONNECTOR_INGEST',
        mimeType: 'video/mp4',
        storagePath: '/secure/worm/jhb/cam-012-clip.mp4',
        fileSizeBytes: BigInt(samplePayload.length),
        sha256Hash: sha256,
        isOriginalPreserved: true,
      },
    });
    testEvidenceId = evidence.id;
    assert.strictEqual(evidence.sha256Hash, sha256, 'SHA-256 evidence hash matches');

    // 6. Chain of Custody Record
    const custodyHash = crypto.createHash('sha256').update('GENESIS' + evidence.id + officer.id).digest('hex');
    const custody = await prisma.evidenceChainOfCustody.create({
      data: {
        evidenceId: evidence.id,
        officerId: officer.id,
        action: 'INGESTED',
        verificationHash: custodyHash,
      },
    });
    assert(custody.id, 'Chain of custody record created');

    // 7. Tamper-Evident Audit Log Entry
    const auditPayload = agency.id + officer.id + invCase.id + 'EVIDENCE_INGESTED';
    const auditHash = crypto.createHash('sha256').update('PREV_NULL' + auditPayload).digest('hex');
    const auditLog = await prisma.governmentAuditLog.create({
      data: {
        agencyId: agency.id,
        officerId: officer.id,
        caseId: invCase.id,
        action: 'EVIDENCE_INGESTED',
        resourceAccessed: evidence.id,
        warrantRef: 'CPA-SEC-205-REF-9921',
        previousLogHash: 'GENESIS_ROOT',
        currentLogHash: auditHash,
      },
    });
    testLogId = auditLog.id;
    assert.strictEqual(auditLog.currentLogHash, auditHash, 'Cryptographic audit log verified');
  });

  console.log('\n--- SECTION 5: CLEANUP OF TEST FIXTURE RECORDS ---');

  await asyncCheck('Clean up temporary test records to keep database clean', async () => {
    if (testLogId) await prisma.governmentAuditLog.delete({ where: { id: testLogId } });
    if (testEvidenceId) {
      await prisma.evidenceChainOfCustody.deleteMany({ where: { evidenceId: testEvidenceId } });
      await prisma.derivedArtifact.deleteMany({ where: { parentEvidenceId: testEvidenceId } });
      await prisma.investigationEvidence.delete({ where: { id: testEvidenceId } });
    }
    if (testCaseId) await prisma.investigationCase.delete({ where: { id: testCaseId } });
    if (testOfficerId) await prisma.governmentOfficer.delete({ where: { id: testOfficerId } });
    if (testAgencyId) await prisma.governmentAgency.delete({ where: { id: testAgencyId } });
  });

  console.log('\n================================================================');
  console.log(`STAGE 1 DATABASE EXTENSION RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
