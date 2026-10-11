/**
 * AFRIQORA Universal Integration Layer - Automated Verification Test Suite
 * Tests 5 adapters, disabled-by-default rules, warrant enforcement, tamper-evident audit logs
 */

const assert = require('assert');
const crypto = require('crypto');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const { IntegrationHub } = require('../backend/dist/modules/government/integrations/integrationHub');
const { CredentialVault } = require('../backend/dist/modules/government/integrations/security/credentialVault');
const { CCTVAdapter } = require('../backend/dist/modules/government/integrations/adapters/cctv.adapter');
const { MobileForensicsAdapter } = require('../backend/dist/modules/government/integrations/adapters/mobileForensics.adapter');
const { ComputerForensicsAdapter } = require('../backend/dist/modules/government/integrations/adapters/computerForensics.adapter');
const { SatelliteIntelligenceAdapter } = require('../backend/dist/modules/government/integrations/adapters/satellite.adapter');
const { GovDatabaseAdapter } = require('../backend/dist/modules/government/integrations/adapters/govDatabase.adapter');

const prisma = new PrismaClient();

console.log('================================================================');
console.log('AFRIQORA STAGE 2: UNIVERSAL INTEGRATION LAYER VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let total = 0;

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
  console.log('--- SECTION 1: CREDENTIAL VAULT (AES-256-GCM) VERIFICATION ---');

  await asyncCheck('AES-256-GCM: Encrypts and decrypts integration credentials safely', async () => {
    const rawSecret = JSON.stringify({ apiKey: 'secret_onvif_token_99182', username: 'admin' });
    const encrypted = CredentialVault.encrypt(rawSecret);
    assert(encrypted.includes(':'), 'Ciphertext contains iv:tag:payload structure');
    const decrypted = CredentialVault.decrypt(encrypted);
    assert.strictEqual(decrypted, rawSecret, 'Decrypted credential matches source payload');
  });

  console.log('\n--- SECTION 2: ADAPTER UNIT VERIFICATION & HEALTH CHECKS ---');

  await asyncCheck('Adapter Unit: CCTVAdapter health check & radius query', async () => {
    const adapter = new CCTVAdapter();
    const health = await adapter.testConnection({ endpointUrl: 'https://vms.jhb.gov.za' });
    assert(health.healthy === true, 'CCTV health check ok');

    // In-scope location (Johannesburg CBD Main & Eloff)
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
      timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
    }, {});

    assert.strictEqual(result.status, 'SUCCESS', 'Query returned success');
    assert(result.assets.length > 0, 'Found cameras covering Johannesburg CBD');
    assert(result.assets[0].sha256Hash.length === 64, 'Computed SHA-256 evidence hash');
    assert.strictEqual(result.epistemicTier, 'OBSERVED_FACT', 'CCTV marked as OBSERVED_FACT');
  });

  await asyncCheck('Adapter Unit: CCTVAdapter handles out-of-range coordinates gracefully', async () => {
    const adapter = new CCTVAdapter();
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      location: { lat: -20.0000, lon: 10.0000, radiusMeters: 50 }, // Ocean / No cameras
      timeRange: { start: new Date(), end: new Date() },
    }, {});

    assert.strictEqual(result.status, 'NO_DATA');
    assert.strictEqual(result.epistemicTier, 'UNAVAILABLE_INFORMATION');
    assert.strictEqual(result.assets.length, 0);
  });

  await asyncCheck('Adapter Unit: MobileForensicsAdapter parses extracted mobile package', async () => {
    const adapter = new MobileForensicsAdapter();
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      legalMandateRef: 'CPA-SEC-205-REF',
      targetIdentifiers: ['IMEI-358918291029182'],
      timeRange: { start: new Date(), end: new Date() },
    }, {});

    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.assets.length, 1);
    assert(result.assets[0].sourceType === 'MOBILE_FORENSICS');
    assert(result.assets[0].sha256Hash.length === 64);
  });

  await asyncCheck('Adapter Unit: ComputerForensicsAdapter ingests disk image manifest', async () => {
    const adapter = new ComputerForensicsAdapter();
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      targetIdentifiers: ['SEIZED_LAPTOP_NVME_01'],
      timeRange: { start: new Date(), end: new Date() },
    }, {});

    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.assets.length, 1);
    assert(result.assets[0].sourceType === 'COMPUTER_FORENSICS');
  });

  await asyncCheck('Adapter Unit: SatelliteIntelligenceAdapter bridges Sentinel-1 & 2 pipelines', async () => {
    const adapter = new SatelliteIntelligenceAdapter();
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      location: { lat: -26.2045, lon: 28.0450, radiusMeters: 1000 },
      timeRange: { start: new Date('2026-09-01'), end: new Date('2026-10-01') },
    }, {});

    assert.strictEqual(result.status, 'SUCCESS');
    assert(result.assets.length > 0);
    assert(result.assets[0].metadataJson.sarObservation !== undefined);
    assert(result.assets[0].metadataJson.opticalObservation !== undefined);
  });

  await asyncCheck('Adapter Unit: GovDatabaseAdapter queries official vehicle registry with warrant', async () => {
    const adapter = new GovDatabaseAdapter();
    const result = await adapter.query({
      caseId: 'CASE-TEST-01',
      agencyId: 'AGENCY-TEST',
      officerId: 'OFFICER-TEST',
      legalMandateRef: 'MAGISTRATE-WARRANT-991',
      targetIdentifiers: ['CA-82910'],
      timeRange: { start: new Date(), end: new Date() },
    }, {});

    assert.strictEqual(result.status, 'SUCCESS');
    assert(result.assets.length === 1);
    assert.strictEqual(result.assets[0].metadataJson.plate, 'CA-82910');
    assert.strictEqual(result.assets[0].metadataJson.make, 'Toyota');
  });

  console.log('\n--- SECTION 3: INTEGRATION HUB & STRICT AUTHORIZATION ENFORCEMENT ---');

  let testAgency = null;
  let testOfficer = null;
  let testCase = null;
  let disabledIntegration = null;
  let activeIntegration = null;

  await asyncCheck('Setup database test fixtures for integration hub security tests', async () => {
    testAgency = await prisma.governmentAgency.create({
      data: {
        code: 'TEST-AGENCY-SEC-' + Date.now(),
        name: 'Secured Investigations Directorate',
        country: 'South Africa',
        jurisdiction: 'National',
      },
    });

    const user = await prisma.user.findFirst({ where: { governmentOfficer: null } });
    testOfficer = await prisma.governmentOfficer.create({
      data: {
        userId: user.id,
        agencyId: testAgency.id,
        badgeNumber: 'SEC-BADGE-' + Date.now(),
        rank: 'Captain',
        role: 'INVESTIGATOR',
      },
    });

    testCase = await prisma.investigationCase.create({
      data: {
        caseNumber: 'CASE-SEC-' + Date.now(),
        agencyId: testAgency.id,
        leadOfficerId: testOfficer.id,
        title: 'Municipal Infrastructure Incident',
        investigationType: 'serious_crime',
        timeRangeStart: new Date('2026-10-01'),
        timeRangeEnd: new Date('2026-10-10'),
        legalMandateRef: 'WARRANT-JHB-2026-882',
      },
    });

    // 1. Create DISABLED connector (Default state)
    disabledIntegration = await prisma.authorizedIntegration.create({
      data: {
        agencyId: testAgency.id,
        name: 'Unapproved Metro Camera Feed',
        category: 'CCTV',
        adapterType: 'ONVIF_CCTV',
        endpointUrl: 'https://cctv.metro.unapproved',
        authConfigEnc: CredentialVault.encrypt('secret_token'),
        status: 'DISABLED', // Explicitly disabled
        requiresWarrant: true,
        jurisdiction: 'ZA',
      },
    });

    // 2. Create ACTIVE connector
    activeIntegration = await prisma.authorizedIntegration.create({
      data: {
        agencyId: testAgency.id,
        name: 'JHB Municipal Public Safety VMS',
        category: 'CCTV',
        adapterType: 'ONVIF_CCTV',
        endpointUrl: 'https://vms.jhb.gov.za',
        authConfigEnc: CredentialVault.encrypt('secret_token'),
        status: 'ACTIVE', // Approved & authorized
        approvedBy: 'OWNER-USER-001',
        approvedAt: new Date(),
        ownerApprovalSignature: 'PLATFORM_OWNER_VALID_SIGNATURE_HEX',
        requiresWarrant: true,
        jurisdiction: 'ZA',
      },
    });

    // 3. Create Platform Owner Access Grant (Gate 2)
    await prisma.platformOwnerGrant.create({
      data: {
        agencyId: testAgency.id,
        caseId: testCase.id,
        officerId: testOfficer.id,
        requestType: 'INVESTIGATIVE_QUERY',
        requestedScopeJson: JSON.stringify({ category: 'CCTV' }),
        justification: 'Court-authorized infrastructure security verification',
        status: 'APPROVED',
        approvedByOwnerId: 'PLATFORM-OWNER-ROOT',
        approvedAt: new Date(),
        approvalSignature: 'SIG_OWNER_STAGE2_VERIFIED',
      },
    });
  });

  await asyncCheck('Hub Security: Reject queries to DISABLED connector & log audit attempt', async () => {
    const scope = {
      caseId: testCase.id,
      agencyId: testAgency.id,
      officerId: testOfficer.id,
      legalMandateRef: testCase.legalMandateRef,
      location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
      timeRange: { start: new Date('2026-10-01'), end: new Date('2026-10-10') },
    };

    const result = await IntegrationHub.executeQuery({
      integrationId: disabledIntegration.id,
      scope,
    });

    assert.strictEqual(result.status, 'ACCESS_DENIED', 'Blocked query to disabled connector');
    assert(result.message.includes('DISABLED'), 'Message clarifies disabled state');

    // Verify audit log entry
    const auditLog = await prisma.governmentAuditLog.findFirst({
      where: {
        agencyId: testAgency.id,
        action: 'ACCESS_DENIED_DISABLED_CONNECTOR',
      },
    });
    assert(auditLog !== null, 'Created tamper-evident audit log for denied attempt');
  });

  await asyncCheck('Hub Security: Reject warrant-requiring source if warrant is missing', async () => {
    const scopeWithoutWarrant = {
      caseId: testCase.id,
      agencyId: testAgency.id,
      officerId: testOfficer.id,
      legalMandateRef: '', // Missing warrant
      location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
      timeRange: { start: new Date('2026-10-01'), end: new Date('2026-10-10') },
    };

    const result = await IntegrationHub.executeQuery({
      integrationId: activeIntegration.id,
      scope: scopeWithoutWarrant,
    });

    assert.strictEqual(result.status, 'ACCESS_DENIED', 'Blocked warrantless query');
    assert(result.message.includes('warrant'), 'Clarified warrant requirement');
  });

  await asyncCheck('Hub Execution: Successfully execute ACTIVE connector query & ingest evidence', async () => {
    const validScope = {
      caseId: testCase.id,
      agencyId: testAgency.id,
      officerId: testOfficer.id,
      legalMandateRef: testCase.legalMandateRef,
      location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
      timeRange: { start: new Date('2026-10-01'), end: new Date('2026-10-10') },
    };

    const result = await IntegrationHub.executeQuery({
      integrationId: activeIntegration.id,
      scope: validScope,
    });

    assert.strictEqual(result.status, 'SUCCESS');
    assert(result.assets.length > 0, 'Retrieved CCTV assets');

    // Verify evidence record in database
    const savedEvidence = await prisma.investigationEvidence.findFirst({
      where: { caseId: testCase.id },
      include: { chainOfCustody: true },
    });

    assert(savedEvidence !== null, 'Saved evidence record to database');
    assert(savedEvidence.sha256Hash.length === 64, 'Recorded SHA-256 hash');
    assert(savedEvidence.chainOfCustody.length > 0, 'Created Chain of Custody entry');
    assert.strictEqual(savedEvidence.chainOfCustody[0].action, 'INGESTED');
  });

  console.log('\n--- SECTION 4: TEST FIXTURE TEARDOWN ---');

  await asyncCheck('Cleanup test fixtures', async () => {
    if (testAgency) {
      await prisma.platformOwnerGrant.deleteMany({ where: { agencyId: testAgency.id } }).catch(() => {});
    }
    if (testCase) {
      await prisma.evidenceChainOfCustody.deleteMany({
        where: { evidence: { caseId: testCase.id } },
      });
      await prisma.investigationEvidence.deleteMany({ where: { caseId: testCase.id } });
      await prisma.investigationCase.delete({ where: { id: testCase.id } });
    }
    if (disabledIntegration) {
      await prisma.authorizedIntegration.delete({ where: { id: disabledIntegration.id } });
    }
    if (activeIntegration) {
      await prisma.authorizedIntegration.delete({ where: { id: activeIntegration.id } });
    }
    if (testAgency) {
      await prisma.governmentAuditLog.deleteMany({ where: { agencyId: testAgency.id } });
      await prisma.governmentOfficer.deleteMany({ where: { agencyId: testAgency.id } });
      await prisma.governmentAgency.delete({ where: { id: testAgency.id } });
    }
  });

  console.log('\n================================================================');
  console.log(`STAGE 2 UNIVERSAL INTEGRATION RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
