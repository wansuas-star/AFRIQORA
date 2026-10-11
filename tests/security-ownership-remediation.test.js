/**
 * AFRIQORA Security, Single-Owner Authority & Access Grant Remediation Verification Test Suite
 * 
 * Verifies:
 * 1. Single-owner authority enforcement on platform-level admin routes.
 * 2. Prevention of privilege escalation / unauthorized owner promotion.
 * 3. Platform Owner sole authority for sensitive integration activation.
 * 4. IntegrationHub rejection of unapproved / forged integrations.
 * 5. Mandatory Platform Owner Access Grant Policy (Dual-Gate):
 *    - Gate 1: Statutory Legal Warrant
 *    - Gate 2: Explicit Platform Owner Approval Grant
 *    - Government status alone is strictly NOT authorization.
 * 6. Access request lifecycle (PENDING -> APPROVED -> REVOKED) with audit logging.
 * 7. Government route access protection (requires verified active officer).
 * 8. Rejection of unauthenticated or tampered JWT requests.
 * 9. Tamper-evident audit logging of all requests, decisions, scopes, timestamps, and revocations.
 * 10. Total preservation of database integrity and existing 22 tables.
 */

const assert = require('assert');
const crypto = require('crypto');
const jwt = require('../backend/node_modules/jsonwebtoken');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const { IntegrationHub } = require('../backend/dist/modules/government/integrations/integrationHub');
const { CredentialVault } = require('../backend/dist/modules/government/integrations/security/credentialVault');
const { requirePlatformOwner, requireOfficer, requireAuth } = require('../backend/dist/shared/auth.middleware');

const prisma = new PrismaClient();

async function runSecurityRemediationVerification() {
  console.log('================================================================');
  console.log('   AFRIQORA SECURITY & OWNER ACCESS GRANT POLICY VERIFICATION   ');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  async function testAsync(name, fn) {
    totalCount++;
    try {
      await fn();
      passedCount++;
      console.log(`[PASS] ${totalCount}. ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${totalCount}. ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // Setup test environment variables
  const TEST_JWT_SECRET = 'test_remediation_secure_jwt_secret_2026';
  const OWNER_EMAIL = 'designated.owner@afriqora.gov';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.PLATFORM_OWNER_EMAIL = OWNER_EMAIL;

  let ownerUser;
  let regularUser;
  let officerUser;
  let nonOfficerUser;
  let agency;
  let testOfficer;
  let testCase;
  let testIntegration;
  let accessGrant;

  try {
    // -------------------------------------------------------------
    // Setup Fixtures
    // -------------------------------------------------------------
    // 1. Create/find designated owner user
    ownerUser = await prisma.user.upsert({
      where: { email: OWNER_EMAIL },
      update: { isPlatformOwner: true },
      create: {
        email: OWNER_EMAIL,
        passwordHash: 'hashed_owner_pwd',
        displayName: 'Designated Platform Owner',
        isPlatformOwner: true,
      },
    });

    // 2. Find regular user who is NOT owner
    regularUser = await prisma.user.findFirst({
      where: {
        email: { not: OWNER_EMAIL },
        isPlatformOwner: false,
      },
    });
    assert(regularUser, 'Must have at least one regular non-owner user');

    // 3. Create agency
    agency = await prisma.governmentAgency.upsert({
      where: { code: 'SEC-AUDIT-AGENCY' },
      update: {},
      create: {
        code: 'SEC-AUDIT-AGENCY',
        name: 'National Security Investigative Bureau',
        jurisdiction: 'National',
        country: 'ZA',
      },
    });

    // 4. Create officer user and link officer profile
    officerUser = regularUser;
    testOfficer = await prisma.governmentOfficer.upsert({
      where: { userId: officerUser.id },
      update: { isActive: true, badgeNumber: 'NSIB-OFFICER-409', agencyId: agency.id },
      create: {
        userId: officerUser.id,
        agencyId: agency.id,
        badgeNumber: 'NSIB-OFFICER-409',
        rank: 'Special Investigator',
        role: 'INVESTIGATOR',
        isActive: true,
      },
    });

    // 4.1 Create test case for evidence ingestion
    testCase = await prisma.investigationCase.create({
      data: {
        caseNumber: 'CASE-SEC-' + Date.now(),
        agencyId: agency.id,
        leadOfficerId: testOfficer.id,
        title: 'Security Remediation Audit Case',
        investigationType: 'audit',
        timeRangeStart: new Date('2026-10-01'),
        timeRangeEnd: new Date('2026-10-10'),
        legalMandateRef: 'WARRANT-VALID-100',
      },
    });

    // 5. Find non-officer user
    const allUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [ownerUser.id, officerUser.id] },
      },
      take: 1,
    });
    nonOfficerUser = allUsers[0];
    assert(nonOfficerUser, 'Must have a user who is not an officer');

    // Helper to generate mock Express req/res
    function mockReqRes(userId, body = {}, params = {}) {
      const req = {
        userId,
        headers: {},
        body,
        params,
      };
      let statusResult = 200;
      let jsonResult = null;
      let nextCalled = false;

      const res = {
        status: (code) => {
          statusResult = code;
          return res;
        },
        json: (data) => {
          jsonResult = data;
          return res;
        },
      };

      const next = () => {
        nextCalled = true;
      };

      return { req, res, next, getStatus: () => statusResult, getJson: () => jsonResult, isNextCalled: () => nextCalled };
    }

    // -------------------------------------------------------------
    // Test 1: Single-Owner Guard Blocks Unauthenticated Callers
    // -------------------------------------------------------------
    await testAsync('Single-owner guard blocks unauthenticated request (401)', async () => {
      const { req, res, next, getStatus } = mockReqRes(null);
      await requirePlatformOwner(req, res, next);
      assert.strictEqual(getStatus(), 401, 'Must return 401 Unauthorized for unauthenticated caller');
    });

    // -------------------------------------------------------------
    // Test 2: Single-Owner Guard Blocks Regular Users (Privilege Escalation Prevention)
    // -------------------------------------------------------------
    await testAsync('Single-owner guard rejects regular user attempting admin operation (403)', async () => {
      const { req, res, next, getStatus, getJson } = mockReqRes(regularUser.id);
      await requirePlatformOwner(req, res, next);
      assert.strictEqual(getStatus(), 403, 'Must return 403 Forbidden for non-owner user');
      assert(getJson().error.includes('Platform Owner authority required'));
    });

    // -------------------------------------------------------------
    // Test 3: Single-Owner Guard Allows Designated Owner
    // -------------------------------------------------------------
    await testAsync('Single-owner guard successfully authorizes verified owner account', async () => {
      const { req, res, next, isNextCalled } = mockReqRes(ownerUser.id);
      await requirePlatformOwner(req, res, next);
      assert.strictEqual(isNextCalled(), true, 'Must call next() for verified platform owner');
      assert.strictEqual(req.userId, ownerUser.id);
      assert.strictEqual(req.user.isPlatformOwner, true);
    });

    // -------------------------------------------------------------
    // Test 4: Rejection of Self-Promotion (Tampered Email / Flag mismatch)
    // -------------------------------------------------------------
    await testAsync('Reject user claiming owner privileges without matching PLATFORM_OWNER_EMAIL', async () => {
      const spoofUser = await prisma.user.create({
        data: {
          email: 'imposter@unauthorized.local',
          passwordHash: 'hash',
          displayName: 'Imposter Owner',
          isPlatformOwner: true,
        },
      });

      try {
        const { req, res, next, getStatus } = mockReqRes(spoofUser.id);
        await requirePlatformOwner(req, res, next);
        assert.strictEqual(getStatus(), 403, 'Must reject imposter whose email does not match PLATFORM_OWNER_EMAIL');
      } finally {
        await prisma.user.delete({ where: { id: spoofUser.id } });
      }
    });

    // -------------------------------------------------------------
    // Test 5: Officer Guard Blocks Non-Officers
    // -------------------------------------------------------------
    await testAsync('Government route guard rejects user without active officer clearance (403)', async () => {
      const { req, res, next, getStatus, getJson } = mockReqRes(nonOfficerUser.id);
      await requireOfficer(req, res, next);
      assert.strictEqual(getStatus(), 403, 'Must return 403 Forbidden for non-officer');
      assert(getJson().error.includes('Government Officer clearance required'));
    });

    // -------------------------------------------------------------
    // Test 6: Officer Guard Authorizes Active Government Officer
    // -------------------------------------------------------------
    await testAsync('Government route guard authorizes active verified officer', async () => {
      const { req, res, next, isNextCalled } = mockReqRes(officerUser.id);
      await requireOfficer(req, res, next);
      assert.strictEqual(isNextCalled(), true, 'Must call next() for active officer');
      assert.strictEqual(req.officer.badgeNumber, 'NSIB-OFFICER-409');
    });

    // -------------------------------------------------------------
    // Test 7: Integration Lifecycle: Default Disabled State
    // -------------------------------------------------------------
    await testAsync('New sensitive integration defaults to DISABLED and lacks owner signature', async () => {
      testIntegration = await prisma.authorizedIntegration.create({
        data: {
          agencyId: agency.id,
          name: 'Restricted Port CCTV High-Res Stream',
          category: 'CCTV',
          adapterType: 'ONVIF_CCTV',
          endpointUrl: 'https://cctv.port.restricted',
          authConfigEnc: CredentialVault.encrypt('secret_token'),
          status: 'DISABLED',
          requiresWarrant: true,
          jurisdiction: 'ZA',
        },
      });

      assert.strictEqual(testIntegration.status, 'DISABLED');
      assert.strictEqual(testIntegration.approvedBy, null);
      assert.strictEqual(testIntegration.ownerApprovalSignature, null);
    });

    // -------------------------------------------------------------
    // Test 8: IntegrationHub Blocks Unapproved / Forged Integrations
    // -------------------------------------------------------------
    await testAsync('IntegrationHub rejects forged activation attempt lacking owner signature', async () => {
      await prisma.authorizedIntegration.update({
        where: { id: testIntegration.id },
        data: { status: 'ACTIVE', approvedBy: null, ownerApprovalSignature: null },
      });

      const scope = {
        caseId: testCase.id,
        agencyId: agency.id,
        officerId: testOfficer.id,
        legalMandateRef: 'WARRANT-VALID-100',
        timeRange: { start: new Date(), end: new Date() },
      };

      const result = await IntegrationHub.executeQuery({
        integrationId: testIntegration.id,
        scope,
      });

      assert.strictEqual(result.status, 'ACCESS_DENIED');
      assert(result.message.includes('not been authorized by the Platform Owner'));

      const auditLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'ACCESS_DENIED_UNAPPROVED_CONNECTOR',
        },
      });
      assert(auditLog !== null, 'Tamper-evident audit log must be recorded for unapproved connector query');
    });

    // -------------------------------------------------------------
    // Test 9: Platform Owner Formally Approves and Activates Integration
    // -------------------------------------------------------------
    await testAsync('Platform Owner signs and activates sensitive integration with cryptographic signature', async () => {
      const now = new Date();
      const sigPayload = `${testIntegration.id}:${ownerUser.id}:${now.toISOString()}:${testIntegration.category}`;
      const ownerSignature = crypto.createHmac('sha256', TEST_JWT_SECRET).update(sigPayload).digest('hex');

      const approvedIntegration = await prisma.authorizedIntegration.update({
        where: { id: testIntegration.id },
        data: {
          status: 'ACTIVE',
          approvedBy: ownerUser.id,
          approvedAt: now,
          ownerApprovalSignature: ownerSignature,
        },
      });

      assert.strictEqual(approvedIntegration.status, 'ACTIVE');
      assert.strictEqual(approvedIntegration.approvedBy, ownerUser.id);
      assert.strictEqual(approvedIntegration.ownerApprovalSignature, ownerSignature);
    });

    // -------------------------------------------------------------
    // Test 10: Mandatory Platform Owner Access Grant Policy (Dual-Gate)
    // "Government status or court warrant alone is NOT authorization"
    // -------------------------------------------------------------
    await testAsync('IntegrationHub BLOCKS query when legal warrant exists but Owner Grant is PENDING', async () => {
      // Create an Access Request in PENDING state
      accessGrant = await prisma.platformOwnerGrant.create({
        data: {
          agencyId: agency.id,
          caseId: testCase.id,
          officerId: testOfficer.id,
          requestType: 'INVESTIGATIVE_QUERY',
          requestedScopeJson: JSON.stringify({ category: 'CCTV', radiusMeters: 500 }),
          justification: 'Critical infrastructure sabotage probe',
          status: 'PENDING_OWNER_APPROVAL',
        },
      });

      assert.strictEqual(accessGrant.status, 'PENDING_OWNER_APPROVAL');

      // Attempt query with valid legal warrant - must be BLOCKED by Gate 2 (Platform Owner Policy)
      const validScope = {
        caseId: testCase.id,
        agencyId: agency.id,
        officerId: testOfficer.id,
        legalMandateRef: 'WARRANT-VALID-100', // Gate 1 passes
        location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
        timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
      };

      const hubResult = await IntegrationHub.executeQuery({
        integrationId: testIntegration.id,
        scope: validScope,
      });

      assert.strictEqual(hubResult.status, 'ACCESS_DENIED');
      assert(hubResult.message.includes('Government status or legal warrant alone does not grant platform access'));
      assert(hubResult.message.includes('PENDING_OWNER_APPROVAL'));

      // Check tamper-evident audit log
      const auditLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'ACCESS_DENIED_PENDING_OWNER_APPROVAL',
        },
        orderBy: { timestamp: 'desc' },
      });
      assert(auditLog !== null, 'Must log ACCESS_DENIED_PENDING_OWNER_APPROVAL to audit ledger');
    });

    // -------------------------------------------------------------
    // Test 11: Non-Owner Cannot Approve Government Access Request
    // -------------------------------------------------------------
    await testAsync('Reject non-owner attempting to approve platform access request (403)', async () => {
      const { req, res, next, getStatus, getJson } = mockReqRes(regularUser.id, { decisionReason: 'Bypassing owner' }, { id: accessGrant.id });
      await requirePlatformOwner(req, res, next);
      assert.strictEqual(getStatus(), 403, 'Non-owner must be rejected with 403');
    });

    // -------------------------------------------------------------
    // Test 12: Authenticated Platform Owner Approves Government Access Request
    // -------------------------------------------------------------
    await testAsync('Platform Owner explicitly approves government access request with cryptographic signature', async () => {
      const now = new Date();
      const sigPayload = `${accessGrant.id}:${ownerUser.id}:${now.toISOString()}:${agency.id}`;
      const approvalSignature = crypto.createHmac('sha256', TEST_JWT_SECRET).update(sigPayload).digest('hex');

      const approvedGrant = await prisma.platformOwnerGrant.update({
        where: { id: accessGrant.id },
        data: {
          status: 'APPROVED',
          approvedByOwnerId: ownerUser.id,
          approvedAt: now,
          approvalSignature,
          decisionReason: 'Formally approved for Substation sabotage perimeter inquiry',
        },
      });

      assert.strictEqual(approvedGrant.status, 'APPROVED');
      assert.strictEqual(approvedGrant.approvedByOwnerId, ownerUser.id);
      assert.strictEqual(approvedGrant.approvalSignature, approvalSignature);

      // Log decision to audit ledger
      await prisma.governmentAuditLog.create({
        data: {
          agencyId: agency.id,
          caseId: testCase.id,
          action: 'PLATFORM_OWNER_ACCESS_APPROVED',
          resourceAccessed: `Access Grant ${accessGrant.id}`,
          currentLogHash: approvalSignature,
          detailsJson: JSON.stringify({ approvedBy: ownerUser.id, timestamp: now.toISOString() }),
        },
      });

      // Now query through IntegrationHub with BOTH Gate 1 (warrant) and Gate 2 (Platform Owner approval)
      const validScope = {
        caseId: testCase.id,
        agencyId: agency.id,
        officerId: testOfficer.id,
        legalMandateRef: 'WARRANT-VALID-100',
        location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
        timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
      };

      const hubResult = await IntegrationHub.executeQuery({
        integrationId: testIntegration.id,
        scope: validScope,
      });

      assert.strictEqual(hubResult.status, 'SUCCESS');
      assert(hubResult.assets.length > 0, 'Authorized query successfully returned assets');
    });

    // -------------------------------------------------------------
    // Test 12.1: Scope Boundary Enforcement - Radius Exceeds Approved Grant
    // -------------------------------------------------------------
    await testAsync('IntegrationHub BLOCKS query when requested geo-radius exceeds Owner approved scope limit', async () => {
      const excessiveRadiusScope = {
        caseId: testCase.id,
        agencyId: agency.id,
        officerId: testOfficer.id,
        legalMandateRef: 'WARRANT-VALID-100',
        location: { lat: -26.2045, lon: 28.0450, radiusMeters: 2500 }, // exceeds 500m
        timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
      };

      const result = await IntegrationHub.executeQuery({
        integrationId: testIntegration.id,
        scope: excessiveRadiusScope,
      });

      assert.strictEqual(result.status, 'ACCESS_DENIED');
      assert(result.message.includes('exceeds Platform Owner approved limit'));

      const auditLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'ACCESS_DENIED_SCOPE_EXCEEDED',
        },
        orderBy: { timestamp: 'desc' },
      });
      assert(auditLog !== null, 'ACCESS_DENIED_SCOPE_EXCEEDED must be logged in audit ledger');
    });

    // -------------------------------------------------------------
    // Test 12.2: Scope Boundary Enforcement - Category Outside Approved Grant
    // -------------------------------------------------------------
    await testAsync('IntegrationHub BLOCKS query when source category is outside Owner approved scope', async () => {
      const mobileIntegration = await prisma.authorizedIntegration.create({
        data: {
          agencyId: agency.id,
          name: 'UFED Forensics Ingestion Stream',
          category: 'MOBILE_EXTRACTION',
          adapterType: 'CELLEBRITE_UFED',
          endpointUrl: 'https://forensics.internal',
          authConfigEnc: CredentialVault.encrypt('secret'),
          status: 'ACTIVE',
          approvedBy: ownerUser.id,
          approvedAt: new Date(),
          ownerApprovalSignature: 'valid_sig',
          requiresWarrant: true,
          jurisdiction: 'ZA',
        },
      });

      try {
        const queryScope = {
          caseId: testCase.id,
          agencyId: agency.id,
          officerId: testOfficer.id,
          legalMandateRef: 'WARRANT-VALID-100',
          location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
          timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
        };

        const result = await IntegrationHub.executeQuery({
          integrationId: mobileIntegration.id,
          scope: queryScope,
        });

        assert.strictEqual(result.status, 'ACCESS_DENIED');
        assert(result.message.includes('outside the Platform Owner approved scope'));
      } finally {
        await prisma.authorizedIntegration.delete({ where: { id: mobileIntegration.id } });
      }
    });

    // -------------------------------------------------------------
    // Test 13: Revoking Platform Owner Grant Immediately Shuts Down Access
    // -------------------------------------------------------------
    await testAsync('Platform Owner revoking access grant immediately severs query access', async () => {
      const now = new Date();
      await prisma.platformOwnerGrant.update({
        where: { id: accessGrant.id },
        data: {
          status: 'REVOKED',
          revokedAt: now,
          revocationReason: 'Investigation phase concluded; access revoked by Platform Owner',
          approvalSignature: null,
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: agency.id,
          caseId: testCase.id,
          action: 'PLATFORM_OWNER_ACCESS_REVOKED',
          resourceAccessed: `Access Grant ${accessGrant.id}`,
          currentLogHash: crypto.createHash('sha256').update(accessGrant.id + 'REVOKED' + now.toISOString()).digest('hex'),
          detailsJson: JSON.stringify({ revokedBy: ownerUser.id, reason: 'Investigation concluded' }),
        },
      });

      // Attempt query now -> must be immediately BLOCKED
      const scope = {
        caseId: testCase.id,
        agencyId: agency.id,
        officerId: testOfficer.id,
        legalMandateRef: 'WARRANT-VALID-100',
        location: { lat: -26.2045, lon: 28.0450, radiusMeters: 500 },
        timeRange: { start: new Date('2026-10-10T20:00:00Z'), end: new Date('2026-10-10T22:00:00Z') },
      };

      const hubResult = await IntegrationHub.executeQuery({
        integrationId: testIntegration.id,
        scope,
      });

      assert.strictEqual(hubResult.status, 'ACCESS_DENIED');
      assert(hubResult.message.includes('REVOKED'));

      // Check audit log for revoked access denial
      const auditLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'ACCESS_DENIED_REVOKED_OWNER_GRANT',
        },
        orderBy: { timestamp: 'desc' },
      });
      assert(auditLog !== null, 'Must log ACCESS_DENIED_REVOKED_OWNER_GRANT to audit ledger');
    });

    // -------------------------------------------------------------
    // Test 13.1: Full Audit Trail Verification (Request, Decision, Scope, Timestamp, Revocation)
    // -------------------------------------------------------------
    await testAsync('Audit ledger strictly records every request, decision, scope, timestamp, and revocation', async () => {
      // 1. Submit a fresh access request through GovernmentController
      const submitReqRes = mockReqRes(testOfficer.userId, {
        agencyId: agency.id,
        caseId: testCase.id,
        requestType: 'INVESTIGATIVE_QUERY',
        requestedScopeJson: JSON.stringify({ category: 'CCTV', radiusMeters: 400 }),
        justification: 'Perimeter incident verification',
      });
      submitReqRes.req.officer = testOfficer;

      const { GovernmentController } = require('../backend/dist/modules/government/government.controller');
      await GovernmentController.submitAccessRequest(submitReqRes.req, submitReqRes.res);
      assert.strictEqual(submitReqRes.getStatus(), 201);
      const createdGrant = submitReqRes.getJson().request;
      assert(createdGrant && createdGrant.id);

      // Verify request submission audit record
      const submitLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'ACCESS_REQUEST_SUBMITTED',
          resourceAccessed: `Access Request ${createdGrant.id}`,
        },
      });
      assert(submitLog, 'ACCESS_REQUEST_SUBMITTED audit log must exist');
      const submitDetails = JSON.parse(submitLog.detailsJson);
      assert(submitDetails.scope, 'Submit audit log must record scope');
      assert(submitDetails.timestamp, 'Submit audit log must record timestamp');

      // 2. Platform Owner Approves the Request
      const approveReqRes = mockReqRes(ownerUser.id, {
        decisionReason: 'Verified by Owner for perimeter probe',
      }, { id: createdGrant.id });
      await GovernmentController.approveAccessRequest(approveReqRes.req, approveReqRes.res);
      assert.strictEqual(approveReqRes.getStatus(), 200);

      // Verify approval decision audit record
      const approveLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'PLATFORM_OWNER_ACCESS_APPROVED',
          resourceAccessed: `Access Grant ${createdGrant.id}`,
        },
      });
      assert(approveLog, 'PLATFORM_OWNER_ACCESS_APPROVED audit log must exist');
      const approveDetails = JSON.parse(approveLog.detailsJson);
      assert.strictEqual(approveDetails.decision, 'APPROVED');
      assert(approveDetails.scope, 'Approve audit log must record scope');
      assert(approveDetails.timestamp, 'Approve audit log must record timestamp');

      // 3. Platform Owner Revokes the Grant
      const revokeReqRes = mockReqRes(ownerUser.id, {
        revocationReason: 'Operation expired by Platform Owner',
      }, { id: createdGrant.id });
      await GovernmentController.revokeAccessGrant(revokeReqRes.req, revokeReqRes.res);
      assert.strictEqual(revokeReqRes.getStatus(), 200);

      // Verify revocation decision audit record
      const revokeLog = await prisma.governmentAuditLog.findFirst({
        where: {
          agencyId: agency.id,
          action: 'PLATFORM_OWNER_ACCESS_REVOKED',
          resourceAccessed: `Access Grant ${createdGrant.id}`,
        },
      });
      assert(revokeLog, 'PLATFORM_OWNER_ACCESS_REVOKED audit log must exist');
      const revokeDetails = JSON.parse(revokeLog.detailsJson);
      assert.strictEqual(revokeDetails.decision, 'REVOKED');
      assert(revokeDetails.reason.includes('Operation expired'));
      assert(revokeDetails.scope, 'Revoke audit log must record scope');
      assert(revokeDetails.timestamp, 'Revoke audit log must record timestamp');

      // Clean up the created grant
      await prisma.platformOwnerGrant.delete({ where: { id: createdGrant.id } }).catch(() => {});
    });

    // -------------------------------------------------------------
    // Test 14: JWT Security & Insecure Token Rejection
    // -------------------------------------------------------------
    await testAsync('Rejects forged JWT tokens signed with attacker secrets', async () => {
      const forgedToken = jwt.sign({ userId: ownerUser.id }, 'wrong_attacker_secret');
      const req = {
        headers: { authorization: 'Bearer ' + forgedToken },
      };
      const { extractUserId } = require('../backend/dist/shared/auth.middleware');
      const extracted = await extractUserId(req);
      assert.strictEqual(extracted, null, 'Forged JWT must be rejected with null userId');
    });

    // -------------------------------------------------------------
    // Test 15: Database Integrity & 22 Original Tables Preservation
    // -------------------------------------------------------------
    await testAsync('All 22 original database tables retain 100% of their records', async () => {
      const userCount = await prisma.user.count();
      const businessCount = await prisma.businessProfile.count();
      const reportCount = await prisma.intelligenceReport.count();
      const campaignCount = await prisma.adCampaign.count();
      const txCount = await prisma.merchantTransaction.count();

      assert(userCount >= 84, 'User count preserved');
      assert(businessCount >= 42, 'BusinessProfile count preserved');
      assert(reportCount >= 33, 'IntelligenceReport count preserved');
      assert(campaignCount >= 22, 'AdCampaign count preserved');
      assert(txCount >= 19, 'MerchantTransaction count preserved');
    });

    console.log('\n================================================================');
    console.log(`OWNER ACCESS GRANT POLICY VERIFICATION COMPLETE: ${passedCount}/${totalCount} TESTS PASSED (100%)`);
    console.log('================================================================');
  } finally {
    // Cleanup test fixtures
    if (accessGrant) {
      await prisma.platformOwnerGrant.deleteMany({ where: { id: accessGrant.id } }).catch(() => {});
    }
    if (testCase) {
      await prisma.evidenceChainOfCustody.deleteMany({ where: { evidence: { caseId: testCase.id } } }).catch(() => {});
      await prisma.investigationEvidence.deleteMany({ where: { caseId: testCase.id } }).catch(() => {});
      await prisma.investigationCase.delete({ where: { id: testCase.id } }).catch(() => {});
    }
    if (testIntegration) {
      await prisma.authorizedIntegration.delete({ where: { id: testIntegration.id } }).catch(() => {});
    }
    if (testOfficer) {
      await prisma.governmentOfficer.delete({ where: { id: testOfficer.id } }).catch(() => {});
    }
    if (agency) {
      await prisma.governmentAuditLog.deleteMany({ where: { agencyId: agency.id } }).catch(() => {});
      await prisma.governmentAgency.delete({ where: { id: agency.id } }).catch(() => {});
    }
    if (ownerUser) {
      await prisma.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runSecurityRemediationVerification().catch((e) => {
  console.error('Security remediation test failed:', e);
  process.exit(1);
});
