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
      const { decisionReason, approvedScopeJson } = req.body;

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
          requestedScopeJson: approvedScopeJson ? (typeof approvedScopeJson === 'string' ? approvedScopeJson : JSON.stringify(approvedScopeJson)) : request.requestedScopeJson,
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

}
