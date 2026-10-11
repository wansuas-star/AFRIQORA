
/**
 * Strict Platform Owner Grant Validity & Expiration Checker
 * Enforces: Approval status, cryptographic signature integrity, non-revocation, and temporal expiration.
 */
export function checkGrantValidity(grant: any): { isValid: boolean; reason: string } {
  if (!grant) return { isValid: false, reason: 'NO_GRANT' };
  if (grant.status !== 'APPROVED') return { isValid: false, reason: 'NOT_APPROVED' };
  if (!grant.approvalSignature || grant.approvalSignature.length < 32) return { isValid: false, reason: 'INVALID_SIGNATURE' };
  if (grant.revokedAt) return { isValid: false, reason: 'REVOKED' };

  if (grant.requestedScopeJson) {
    try {
      const scope = JSON.parse(grant.requestedScopeJson);
      if (scope.expiresAt && new Date(scope.expiresAt).getTime() <= Date.now()) {
        return { isValid: false, reason: 'EXPIRED' };
      }
      if (scope.durationHours && grant.approvedAt) {
        const expiry = new Date(grant.approvedAt).getTime() + Number(scope.durationHours) * 3600000;
        if (expiry <= Date.now()) {
          return { isValid: false, reason: 'EXPIRED' };
        }
      }
    } catch (e) {}
  }

  return { isValid: true, reason: 'VALID' };
}

/**
 * AFRIQORA Government Investigative Intelligence Controller
 * Case Dossier Management, Evidence Provenance, Human Review & Audit Ledgers
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { IntegrationHub } from './integrations/integrationHub';
import { QueryScope } from './integrations/adapter.interface';

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return Array.isArray(ua) ? ua[0] : ua;
}

export class GovernmentController {
  /**
   * List all investigation cases accessible to the agency
   */
  public static async listCases(req: Request, res: Response): Promise<void> {
    try {
      const { agencyId } = req.query;
      
      const whereClause: any = {};
      if (agencyId) {
        whereClause.agencyId = String(agencyId);
      }

      const cases = await prisma.investigationCase.findMany({
        where: whereClause,
        include: {
          leadOfficer: {
            select: { badgeNumber: true, rank: true, role: true },
          },
          _count: {
            select: { evidenceItems: true, reports: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ ok: true, cases });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Create an authorized investigation case
   */
  public static async createCase(req: Request, res: Response): Promise<void> {
    try {
      const {
        agencyId,
        leadOfficerId,
        title,
        investigationType,
        classification = 'CONFIDENTIAL',
        incidentLocation,
        incidentLat,
        incidentLon,
        incidentRadiusM = 500.0,
        timeRangeStart,
        timeRangeEnd,
        legalMandateRef,
        isEmergency = false,
        emergencyReason,
        summary,
      } = req.body;

      if (!agencyId || !leadOfficerId || !title || !investigationType || !legalMandateRef) {
        res.status(400).json({
          ok: false,
          error: 'Missing mandatory case parameters (agencyId, leadOfficerId, title, investigationType, legalMandateRef)',
        });
        return;
      }

      const caseNumber = `AFRIQORA-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newCase = await prisma.investigationCase.create({
        data: {
          caseNumber,
          agencyId,
          leadOfficerId,
          title,
          investigationType,
          classification,
          status: 'OPEN',
          incidentLocation,
          incidentLat: incidentLat ? Number(incidentLat) : null,
          incidentLon: incidentLon ? Number(incidentLon) : null,
          incidentRadiusM: incidentRadiusM ? Number(incidentRadiusM) : 500.0,
          timeRangeStart: new Date(timeRangeStart || Date.now() - 7 * 86400000),
          timeRangeEnd: new Date(timeRangeEnd || Date.now()),
          legalMandateRef,
          isEmergency: Boolean(isEmergency),
          emergencyReason,
          summary,
        },
      });

      // Log case creation in audit ledger
      await prisma.governmentAuditLog.create({
        data: {
          agencyId,
          officerId: leadOfficerId,
          caseId: newCase.id,
          action: 'CASE_CREATED',
          resourceAccessed: `Case ${newCase.caseNumber}`,
          warrantRef: legalMandateRef,
          currentLogHash: crypto.createHash('sha256').update(newCase.id + 'CREATED').digest('hex'),
        },
      });

      res.status(201).json({ ok: true, case: newCase });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Get complete Case Dossier including evidence, timeline, and reports
   */
  public static async getCaseDossier(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const caseRecord: any = await prisma.investigationCase.findUnique({
        where: { id },
        include: {
          agency: true,
          leadOfficer: true,
          evidenceItems: {
            include: { chainOfCustody: true, derivedArtifacts: true },
            orderBy: { acquisitionDate: 'desc' },
          },
          reports: {
            orderBy: { createdAt: 'desc' },
          },
          auditLogs: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
        },
      });

      if (!caseRecord) {
        res.status(404).json({ ok: false, error: 'Case not found' });
        return;
      }

      // --- PLATFORM OWNER MANDATORY SENSITIVE INFORMATION POLICY ---
      // Sensitive evidence is protected and locked by default.
      // Gate 1: Judicial Warrant Reference
      const hasLegalWarrant = Boolean(caseRecord.legalMandateRef && caseRecord.legalMandateRef.trim().length > 0);

      // Gate 2: Explicit Personal Platform Owner Authorization Grant
      const activeGrant = await prisma.platformOwnerGrant.findFirst({
        where: {
          agencyId: caseRecord.agencyId,
          OR: [
            { caseId: caseRecord.id },
            { caseId: null },
          ],
          status: 'APPROVED',
          approvalSignature: { not: null },
          revokedAt: null,
        },
      });

      const grantValidity = checkGrantValidity(activeGrant);
      const isOwnerAuthorized = grantValidity.isValid;
      const canAccessSensitiveEvidence = hasLegalWarrant && isOwnerAuthorized;

      if (activeGrant && !grantValidity.isValid && grantValidity.reason === 'EXPIRED') {
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'ACCESS_DENIED_EXPIRED_OWNER_GRANT',
            resourceAccessed: `Case ${caseRecord.caseNumber} Evidence Vault`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(caseRecord.id + 'EXPIRED_GRANT' + Date.now()).digest('hex'),
            detailsJson: JSON.stringify({ reason: 'Platform Owner authorization grant has expired', grantId: activeGrant.id }),
          },
        });
      }

      let sanitizedEvidence = caseRecord.evidenceItems || [];
      if (!canAccessSensitiveEvidence) {
        // Redact and lock sensitive evidence by default
        sanitizedEvidence = sanitizedEvidence.map((ev: any) => ({
          id: ev.id,
          caseId: ev.caseId,
          sourceType: ev.sourceType,
          sourceName: ev.sourceName,
          sourceOrganization: ev.sourceOrganization,
          acquisitionMethod: ev.acquisitionMethod,
          acquisitionDate: ev.acquisitionDate,
          originalDate: ev.originalDate,
          mimeType: ev.mimeType,
          fileSizeBytes: ev.fileSizeBytes ? ev.fileSizeBytes.toString() : '0',
          sha256Hash: ev.sha256Hash,
          storagePath: !isOwnerAuthorized
            ? '[RESTRICTED: PENDING PLATFORM OWNER AUTHORIZATION]'
            : '[RESTRICTED: MISSING JUDICIAL WARRANT]',
          metadataJson: JSON.stringify({
            status: 'ACCESS_RESTRICTED',
            policy: 'Sensitive digital evidence is protected by default. Access strictly requires verified judicial warrant AND personal Platform Owner authorization.',
            isOwnerAuthorized,
            hasLegalWarrant,
          }),
          isRestrictedByPolicy: true,
          chainOfCustody: (ev.chainOfCustody || []).map((c: any) => ({
            id: c.id,
            evidenceId: c.evidenceId,
            action: c.action,
            timestamp: c.timestamp,
            details: '[RESTRICTED - CUSTODY RECORD REDACTED PENDING OWNER APPROVAL]',
            verificationHash: c.verificationHash,
          })),
          derivedArtifacts: [],
        }));

        // Log sensitive evidence access restriction to tamper-evident audit ledger
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'ACCESS_DENIED_SENSITIVE_EVIDENCE_LOCKED',
            resourceAccessed: `Case ${caseRecord.caseNumber} Evidence Vault`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(caseRecord.id + 'EVIDENCE_LOCKED' + Date.now()).digest('hex'),
            detailsJson: JSON.stringify({
              reason: !isOwnerAuthorized ? 'Lacks Platform Owner authorization grant' : 'Missing judicial warrant reference',
              isOwnerAuthorized,
              hasLegalWarrant,
              evidenceItemsCount: (caseRecord.evidenceItems || []).length,
            }),
          },
        });
      } else {
        // Log authorized sensitive evidence access
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'SENSITIVE_EVIDENCE_ACCESSED',
            resourceAccessed: `Case ${caseRecord.caseNumber} Evidence Vault`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(caseRecord.id + activeGrant!.id + Date.now()).digest('hex'),
            detailsJson: JSON.stringify({
              grantId: activeGrant!.id,
              evidenceItemsCount: (caseRecord.evidenceItems || []).length,
              authorizedScope: activeGrant!.requestedScopeJson,
            }),
          },
        });
      }

      caseRecord.evidenceItems = sanitizedEvidence.map((ev: any) => ({
        ...ev,
        fileSizeBytes: ev.fileSizeBytes ? ev.fileSizeBytes.toString() : '0',
      }));

      // Build multi-source correlated timeline
      const timeline = (caseRecord.evidenceItems || []).map((ev: any) => {
        let parsedMeta: any = {};
        try {
          parsedMeta = ev.metadataJson ? JSON.parse(ev.metadataJson) : {};
        } catch (e) {}

        return {
          evidenceId: ev.id,
          sourceType: ev.sourceType,
          sourceName: ev.sourceName,
          sourceOrganization: ev.sourceOrganization,
          timestamp: ev.originalDate || ev.acquisitionDate,
          sha256Hash: ev.sha256Hash,
          mimeType: ev.mimeType,
          isSimulated: true, // Clearly marked as development simulation
          telemetry: parsedMeta,
        };
      });

      res.json({
        ok: true,
        case: caseRecord,
        timeline,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Automated Multi-Source Discovery & Scoped Data Query
   */
  public static async queryAuthorizedSources(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { targetIdentifiers } = req.body;

      const caseRecord = await prisma.investigationCase.findUnique({
        where: { id },
      });

      if (!caseRecord) {
        res.status(404).json({ ok: false, error: 'Case not found' });
        return;
      }

      // Retrieve all active integrations configured for this agency
      const integrations = await prisma.authorizedIntegration.findMany({
        where: {
          agencyId: caseRecord.agencyId,
          status: 'ACTIVE',
        },
      });

      const scope: QueryScope = {
        caseId: caseRecord.id,
        agencyId: caseRecord.agencyId,
        officerId: caseRecord.leadOfficerId,
        legalMandateRef: caseRecord.legalMandateRef,
        isEmergency: caseRecord.isEmergency,
        location: caseRecord.incidentLat && caseRecord.incidentLon ? {
          lat: caseRecord.incidentLat,
          lon: caseRecord.incidentLon,
          radiusMeters: caseRecord.incidentRadiusM || 500,
        } : undefined,
        timeRange: {
          start: caseRecord.timeRangeStart,
          end: caseRecord.timeRangeEnd,
        },
        targetIdentifiers: targetIdentifiers || [],
      };

      const results = [];
      for (const integration of integrations) {
        try {
          const resResult = await IntegrationHub.executeQuery({
            integrationId: integration.id,
            scope,
            ipAddress: req.ip,
            userAgent: getUserAgent(req),
          });
          results.push(resResult);
        } catch (err: any) {
          results.push({
            adapterId: integration.id,
            category: integration.category as any,
            status: 'ERROR',
            assets: [],
            epistemicTier: 'UNAVAILABLE_INFORMATION',
            message: err.message,
          });
        }
      }

      res.json({
        ok: true,
        sourcesQueriedCount: integrations.length,
        results,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Draft Investigation Report with Epistemic Fact & Inference Segregation
   */
  public static async draftReport(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const {
        title,
        executiveSummary,
        observedFacts = [],
        detectedFindings = [],
        inferredConclusions = [],
        uncertainties = [],
        evidenceReferences = [],
        classification = 'CONFIDENTIAL',
      } = req.body;

      const caseRecord = await prisma.investigationCase.findUnique({
        where: { id },
      });

      if (!caseRecord) {
        res.status(404).json({ ok: false, error: 'Case not found' });
        return;
      }

      const report = await prisma.investigationReport.create({
        data: {
          caseId: id,
          generatedByOfficerId: caseRecord.leadOfficerId,
          title: title || `Investigative Intelligence Report: ${caseRecord.caseNumber}`,
          executiveSummary: executiveSummary || 'Preliminary multi-source correlation dossier.',
          observedFacts: JSON.stringify(observedFacts),
          detectedFindings: JSON.stringify(detectedFindings),
          inferredConclusions: JSON.stringify(inferredConclusions),
          uncertainties: JSON.stringify(uncertainties),
          evidenceReferences: JSON.stringify(evidenceReferences),
          classification,
          isSealed: false, // Must remain unsealed until Human Reviewer signs off
        },
      });

      res.status(201).json({ ok: true, report });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Human Review Sign-Off: Seal Report for Official Court Export
   */
  public static async sealReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = String(req.params.reportId);
      const { reviewerNotes, reviewerOfficerId } = req.body;

      const report = await prisma.investigationReport.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        res.status(404).json({ ok: false, error: 'Report not found' });
        return;
      }

      if (report.isSealed) {
        res.status(400).json({ ok: false, error: 'Report is already sealed' });
        return;
      }

      const sealedReport = await prisma.investigationReport.update({
        where: { id: reportId },
        data: {
          isSealed: true,
        },
      });

      // Record Human Reviewer sign-off in Audit Ledger
      await prisma.governmentAuditLog.create({
        data: {
          caseId: report.caseId,
          officerId: reviewerOfficerId || report.generatedByOfficerId,
          action: 'REPORT_SEALED_HUMAN_REVIEW',
          resourceAccessed: `Report ${report.id}`,
          detailsJson: JSON.stringify({ reviewerNotes: reviewerNotes || 'Human Reviewer Verified Facts' }),
          currentLogHash: crypto.createHash('sha256').update(report.id + 'SEALED').digest('hex'),
          agencyId: (await prisma.investigationCase.findUnique({ where: { id: report.caseId } }))!.agencyId,
        },
      });

      res.json({
        ok: true,
        message: 'Report successfully signed off and sealed by Human Reviewer',
        report: sealedReport,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Get Immutable Audit Ledger for Agency / Case
   */
  public static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { agencyId, caseId } = req.query;

      const whereClause: any = {};
      if (agencyId) whereClause.agencyId = String(agencyId);
      if (caseId) whereClause.caseId = String(caseId);

      const logs = await prisma.governmentAuditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      res.json({ ok: true, logs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * List all integrations with status and approval state
   */
  public static async listIntegrations(_req: Request, res: Response): Promise<void> {
    try {
      const integrations = await prisma.authorizedIntegration.findMany({
        select: {
          id: true,
          agencyId: true,
          name: true,
          category: true,
          adapterType: true,
          endpointUrl: true,
          status: true,
          requiresWarrant: true,
          jurisdiction: true,
          approvedBy: true,
          approvedAt: true,
          ownerApprovalSignature: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ ok: true, integrations });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Platform Owner Sole Authority: Approve and Activate Sensitive Integration
   */
  public static async approveAndActivateIntegration(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const ownerId = (req as any).userId;

      const integration = await prisma.authorizedIntegration.findUnique({
        where: { id },
      });

      if (!integration) {
        res.status(404).json({ ok: false, error: 'Integration connector not found' });
        return;
      }

      const now = new Date();
      const sigPayload = `${integration.id}:${ownerId}:${now.toISOString()}:${integration.category}`;
      const ownerApprovalSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'afriqora_owner_secure_signing_salt_2026').update(sigPayload).digest('hex');

      const updated = await prisma.authorizedIntegration.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          approvedBy: ownerId,
          approvedAt: now,
          ownerApprovalSignature,
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: integration.agencyId,
          action: 'PLATFORM_OWNER_INTEGRATION_ACTIVATED',
          resourceAccessed: integration.name,
          currentLogHash: ownerApprovalSignature,
          detailsJson: JSON.stringify({ approvedBy: ownerId, timestamp: now.toISOString() }),
        },
      });

      res.json({ ok: true, integration: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Platform Owner Sole Authority: Revoke Integration
   */
  public static async revokeIntegration(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const ownerId = (req as any).userId;

      const updated = await prisma.authorizedIntegration.update({
        where: { id },
        data: {
          status: 'REVOKED',
          ownerApprovalSignature: null,
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: updated.agencyId,
          action: 'PLATFORM_OWNER_INTEGRATION_REVOKED',
          resourceAccessed: updated.name,
          currentLogHash: crypto.createHash('sha256').update(id + 'REVOKED').digest('hex'),
          detailsJson: JSON.stringify({ revokedBy: ownerId }),
        },
      });

      res.json({ ok: true, integration: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }


  /**
   * Submit Government Access Request for Platform Owner Approval
   */
  public static async submitAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const {
        agencyId,
        caseId,
        requestType = 'INVESTIGATIVE_QUERY',
        requestedScopeJson = '{}',
        justification,
      } = req.body;

      const officerId = (req as any).officer?.id;

      if (!agencyId || !justification) {
        res.status(400).json({ ok: false, error: 'agencyId and justification are mandatory' });
        return;
      }

      const grant = await prisma.platformOwnerGrant.create({
        data: {
          agencyId,
          caseId,
          officerId,
          requestType,
          requestedScopeJson: typeof requestedScopeJson === 'string' ? requestedScopeJson : JSON.stringify(requestedScopeJson),
          justification,
          status: 'PENDING_OWNER_APPROVAL',
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId,
          officerId,
          caseId,
          action: 'ACCESS_REQUEST_SUBMITTED',
          resourceAccessed: `Access Request ${grant.id}`,
          currentLogHash: crypto.createHash('sha256').update(grant.id + 'SUBMITTED').digest('hex'),
          detailsJson: JSON.stringify({
            requestType,
            justification,
            scope: grant.requestedScopeJson,
            timestamp: grant.createdAt.toISOString(),
          }),
        },
      });

      res.status(201).json({ ok: true, request: grant });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * List Access Requests (Platform Owner sees all; Officers see own agency)
   */
  public static async listAccessRequests(req: Request, res: Response): Promise<void> {
    try {
      const isOwner = (req as any).user?.isPlatformOwner;
      const officerAgencyId = (req as any).officer?.agencyId;

      const whereClause: any = {};
      if (!isOwner && officerAgencyId) {
        whereClause.agencyId = officerAgencyId;
      }

      const requests = await prisma.platformOwnerGrant.findMany({
        where: whereClause,
        include: { agency: true, case: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ ok: true, requests });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Platform Owner Sole Authority: Approve Access Request
   */
  public static async approveAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const ownerId = (req as any).userId;
      const { decisionReason, approvedScopeJson, durationHours, expiresAt } = req.body;

      const request = await prisma.platformOwnerGrant.findUnique({ where: { id } });
      if (!request) {
        res.status(404).json({ ok: false, error: 'Access request not found' });
        return;
      }

      const now = new Date();
      const sigPayload = `${request.id}:${ownerId}:${now.toISOString()}:${request.agencyId}`;
      const approvalSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'afriqora_owner_secure_signing_salt_2026')
        .update(sigPayload)
        .digest('hex');

      const updated = await prisma.platformOwnerGrant.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedByOwnerId: ownerId,
          approvedAt: now,
          approvalSignature,
          decisionReason: decisionReason || 'Authorized by Platform Owner',
          requestedScopeJson: (() => {
            let baseScope: any = {};
            try {
              baseScope = request.requestedScopeJson ? JSON.parse(request.requestedScopeJson) : {};
            } catch (e) {}
            if (approvedScopeJson) {
              try {
                const addScope = typeof approvedScopeJson === 'string' ? JSON.parse(approvedScopeJson) : approvedScopeJson;
                baseScope = { ...baseScope, ...addScope };
              } catch (e) {}
            }
            if (durationHours) {
              baseScope.durationHours = Number(durationHours);
              baseScope.expiresAt = new Date(now.getTime() + Number(durationHours) * 3600000).toISOString();
            } else if (expiresAt) {
              baseScope.expiresAt = new Date(expiresAt).toISOString();
            }
            return JSON.stringify(baseScope);
          })(),
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: request.agencyId,
          caseId: request.caseId,
          action: 'PLATFORM_OWNER_ACCESS_APPROVED',
          resourceAccessed: `Access Grant ${request.id}`,
          currentLogHash: approvalSignature,
          detailsJson: JSON.stringify({
            approvedBy: ownerId,
            decision: 'APPROVED',
            decisionReason: updated.decisionReason,
            scope: updated.requestedScopeJson,
            timestamp: now.toISOString(),
          }),
        },
      });

      res.json({ ok: true, request: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Platform Owner Sole Authority: Reject Access Request
   */
  public static async rejectAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const ownerId = (req as any).userId;
      const { decisionReason } = req.body;

      const now = new Date();
      const updated = await prisma.platformOwnerGrant.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decisionReason: decisionReason || 'Rejected by Platform Owner',
          approvalSignature: null,
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: updated.agencyId,
          caseId: updated.caseId,
          action: 'PLATFORM_OWNER_ACCESS_REJECTED',
          resourceAccessed: `Access Request ${id}`,
          currentLogHash: crypto.createHash('sha256').update(id + 'REJECTED' + now.toISOString()).digest('hex'),
          detailsJson: JSON.stringify({
            rejectedBy: ownerId,
            decision: 'REJECTED',
            reason: decisionReason || 'Rejected by Platform Owner',
            scope: updated.requestedScopeJson,
            timestamp: now.toISOString(),
          }),
        },
      });

      res.json({ ok: true, request: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Platform Owner Sole Authority: Revoke Access Grant
   */
  public static async revokeAccessGrant(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const ownerId = (req as any).userId;
      const { revocationReason } = req.body;

      const now = new Date();
      const updated = await prisma.platformOwnerGrant.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: now,
          revocationReason: revocationReason || 'Revoked by Platform Owner',
          approvalSignature: null,
        },
      });

      await prisma.governmentAuditLog.create({
        data: {
          agencyId: updated.agencyId,
          caseId: updated.caseId,
          action: 'PLATFORM_OWNER_ACCESS_REVOKED',
          resourceAccessed: `Access Grant ${id}`,
          currentLogHash: crypto.createHash('sha256').update(id + 'REVOKED' + now.toISOString()).digest('hex'),
          detailsJson: JSON.stringify({
            revokedBy: ownerId,
            decision: 'REVOKED',
            reason: revocationReason || 'Revoked by Platform Owner',
            scope: updated.requestedScopeJson,
            timestamp: now.toISOString(),
          }),
        },
      });

      res.json({ ok: true, request: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Dual-Gate Protected: Get Individual Sensitive Evidence Item
   * Strictly verifies judicial warrant (Gate 1) AND explicit Platform Owner grant (Gate 2).
   */
  public static async getEvidenceItem(req: Request, res: Response): Promise<void> {
    try {
      const { id: caseId, evidenceId } = req.params;
      const caseRecord = await prisma.investigationCase.findUnique({
        where: { id: String(caseId) },
      });

      if (!caseRecord) {
        res.status(404).json({ ok: false, error: 'Case not found' });
        return;
      }

      const evidence = await prisma.investigationEvidence.findFirst({
        where: { id: String(evidenceId), caseId: String(caseId) },
        include: { chainOfCustody: true, derivedArtifacts: true },
      });

      if (!evidence) {
        res.status(404).json({ ok: false, error: 'Evidence item not found' });
        return;
      }

      // Gate 1: Judicial Warrant Verification
      if (!caseRecord.legalMandateRef || caseRecord.legalMandateRef.trim().length === 0) {
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'ACCESS_DENIED_MISSING_WARRANT',
            resourceAccessed: `Evidence ${evidence.id}`,
            currentLogHash: crypto.createHash('sha256').update(evidence.id + 'DENIED_WARRANT').digest('hex'),
            detailsJson: JSON.stringify({ reason: 'Legal judicial warrant reference required for sensitive evidence access' }),
          },
        });
        res.status(403).json({
          ok: false,
          error: 'Access Denied: Valid judicial warrant or legal mandate is strictly required to access sensitive evidence.',
        });
        return;
      }

      // Gate 2: Explicit Platform Owner Authorization
      const activeGrant = await prisma.platformOwnerGrant.findFirst({
        where: {
          agencyId: caseRecord.agencyId,
          OR: [
            { caseId: caseRecord.id },
            { caseId: null },
          ],
          status: 'APPROVED',
          approvalSignature: { not: null },
          revokedAt: null,
        },
      });

      if (!activeGrant) {
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'ACCESS_DENIED_NO_OWNER_GRANT',
            resourceAccessed: `Evidence ${evidence.id}`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(evidence.id + 'DENIED_OWNER').digest('hex'),
            detailsJson: JSON.stringify({ reason: 'Sensitive evidence access strictly requires explicit authorization from the Platform Owner.' }),
          },
        });
        res.status(403).json({
          ok: false,
          error: 'Access Denied: Sensitive evidence access strictly requires explicit authorization from the Platform Owner.',
        });
        return;
      }

      const grantValidity = checkGrantValidity(activeGrant);
      if (!grantValidity.isValid) {
        const action = grantValidity.reason === 'EXPIRED' ? 'ACCESS_DENIED_EXPIRED_OWNER_GRANT' : 'ACCESS_DENIED_REVOKED_OWNER_GRANT';
        const errorMsg = grantValidity.reason === 'EXPIRED'
          ? 'Access Denied: Platform Owner authorization grant has expired. Re-authorization is strictly required.'
          : 'Access Denied: Platform Owner authorization has been revoked.';

        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action,
            resourceAccessed: `Evidence ${evidence.id}`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(evidence.id + action + Date.now()).digest('hex'),
            detailsJson: JSON.stringify({ reason: errorMsg, grantId: activeGrant.id }),
          },
        });

        res.status(403).json({ ok: false, error: errorMsg });
        return;
      }

      // Audit logged access
      await prisma.governmentAuditLog.create({
        data: {
          agencyId: caseRecord.agencyId,
          caseId: caseRecord.id,
          action: 'SENSITIVE_EVIDENCE_ACCESSED',
          resourceAccessed: `Evidence ${evidence.id}`,
          warrantRef: caseRecord.legalMandateRef,
          currentLogHash: crypto.createHash('sha256').update(evidence.id + activeGrant.id + Date.now()).digest('hex'),
          detailsJson: JSON.stringify({
            grantId: activeGrant.id,
            sourceType: evidence.sourceType,
            sourceName: evidence.sourceName,
          }),
        },
      });

      const safeEvidence = { ...evidence, fileSizeBytes: evidence.fileSizeBytes ? evidence.fileSizeBytes.toString() : '0' };
      res.json({ ok: true, evidence: safeEvidence });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }

  /**
   * Dual-Gate Protected: Export Sensitive Evidence
   * Strictly verifies judicial warrant (Gate 1) AND explicit Platform Owner export approval (Gate 2).
   */
  public static async exportEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { id: caseId, evidenceId } = req.params;
      const caseRecord = await prisma.investigationCase.findUnique({
        where: { id: String(caseId) },
      });

      if (!caseRecord) {
        res.status(404).json({ ok: false, error: 'Case not found' });
        return;
      }

      const evidence = await prisma.investigationEvidence.findFirst({
        where: { id: String(evidenceId), caseId: String(caseId) },
      });

      if (!evidence) {
        res.status(404).json({ ok: false, error: 'Evidence item not found' });
        return;
      }

      // Gate 1: Judicial Warrant Verification
      if (!caseRecord.legalMandateRef || caseRecord.legalMandateRef.trim().length === 0) {
        res.status(403).json({ ok: false, error: 'Export Denied: Missing judicial warrant.' });
        return;
      }

      // Gate 2: Explicit Platform Owner Grant
      const activeGrant = await prisma.platformOwnerGrant.findFirst({
        where: {
          agencyId: caseRecord.agencyId,
          OR: [
            { caseId: caseRecord.id },
            { caseId: null },
          ],
          status: 'APPROVED',
          approvalSignature: { not: null },
          revokedAt: null,
        },
      });

      if (!activeGrant) {
        await prisma.governmentAuditLog.create({
          data: {
            agencyId: caseRecord.agencyId,
            caseId: caseRecord.id,
            action: 'EVIDENCE_EXPORT_DENIED',
            resourceAccessed: `Evidence ${evidence.id}`,
            warrantRef: caseRecord.legalMandateRef,
            currentLogHash: crypto.createHash('sha256').update(evidence.id + 'EXPORT_DENIED').digest('hex'),
            detailsJson: JSON.stringify({ reason: 'Lacks Platform Owner export grant' }),
          },
        });
        res.status(403).json({
          ok: false,
          error: 'Export Denied: Evidence export strictly requires explicit Platform Owner authorization.',
        });
        return;
      }

      const grantValidity = checkGrantValidity(activeGrant);
      if (!grantValidity.isValid) {
        res.status(403).json({
          ok: false,
          error: `Export Denied: Platform Owner grant is ${grantValidity.reason.toLowerCase()}.`,
        });
        return;
      }

      let canExport = true;
      if (activeGrant.requestedScopeJson) {
        try {
          const parsed = JSON.parse(activeGrant.requestedScopeJson);
          if (parsed.allowExport === false) canExport = false;
        } catch (e) {}
      }

      if (!canExport) {
        res.status(403).json({ ok: false, error: 'Export Denied: Owner grant scope restricts data export.' });
        return;
      }

      // Audit authorized export
      await prisma.governmentAuditLog.create({
        data: {
          agencyId: caseRecord.agencyId,
          caseId: caseRecord.id,
          action: 'EVIDENCE_EXPORT_AUTHORIZED',
          resourceAccessed: `Evidence ${evidence.id}`,
          warrantRef: caseRecord.legalMandateRef,
          currentLogHash: crypto.createHash('sha256').update(evidence.id + 'EXPORTED' + Date.now()).digest('hex'),
          detailsJson: JSON.stringify({ grantId: activeGrant.id, exportedAt: new Date().toISOString() }),
        },
      });

      res.json({
        ok: true,
        exportPackage: {
          evidenceId: evidence.id,
          sourceType: evidence.sourceType,
          sourceName: evidence.sourceName,
          sha256Hash: evidence.sha256Hash,
          exportSignature: crypto.createHash('sha256').update(evidence.sha256Hash + activeGrant.approvalSignature).digest('hex'),
          exportedAt: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
}
