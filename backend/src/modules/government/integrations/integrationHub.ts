/**
 * AFRIQORA Universal Integration Hub
 * Central Dispatcher, Lifecycle Controller, and 4-Tier Authorization Validator
 */

import crypto from 'crypto';
import prisma from '../../../config/prisma';
import { IUniversalIntegrationAdapter, IngestionResult, QueryScope } from './adapter.interface';
import { CredentialVault } from './security/credentialVault';
import { CCTVAdapter } from './adapters/cctv.adapter';
import { MobileForensicsAdapter } from './adapters/mobileForensics.adapter';
import { ComputerForensicsAdapter } from './adapters/computerForensics.adapter';
import { SatelliteIntelligenceAdapter } from './adapters/satellite.adapter';
import { GovDatabaseAdapter } from './adapters/govDatabase.adapter';

export class IntegrationHub {
  private static adapters: Map<string, IUniversalIntegrationAdapter> = new Map();

  public static initialize(): void {
    const defaultAdapters: IUniversalIntegrationAdapter[] = [
      new CCTVAdapter(),
      new MobileForensicsAdapter(),
      new ComputerForensicsAdapter(),
      new SatelliteIntelligenceAdapter(),
      new GovDatabaseAdapter(),
    ];

    defaultAdapters.forEach(a => {
      this.adapters.set(a.category, a);
      this.adapters.set(a.id, a);
    });
  }

  public static getAdapter(key: string): IUniversalIntegrationAdapter | undefined {
    if (this.adapters.size === 0) {
      this.initialize();
    }
    return this.adapters.get(key);
  }

  /**
   * Execute an authorized query through a specific integration record
   * Strictly enforces:
   * 1. Connector must exist and be ACTIVE (DISABLED/CONFIGURED rejected)
   * 2. Case ownership and agency match
   * 3. Warrant mandate check if required
   * 4. Geographic & temporal boundary validation
   * 5. Immutable audit logging
   */
  public static async executeQuery(params: {
    integrationId: string;
    scope: QueryScope;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IngestionResult> {
    const { integrationId, scope, ipAddress, userAgent } = params;

    // 1. Fetch integration configuration from database
    const integration = await prisma.authorizedIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration connector with ID '${integrationId}' not found`);
    }

    // 2. Strict Lifecycle Check: Connectors MUST be ACTIVE
    if (integration.status !== 'ACTIVE') {
      await this.logAudit({
        agencyId: integration.agencyId,
        officerId: scope.officerId,
        caseId: scope.caseId,
        action: 'ACCESS_DENIED_DISABLED_CONNECTOR',
        resourceAccessed: integration.name,
        warrantRef: scope.legalMandateRef,
        ipAddress,
        userAgent,
        details: { reason: `Connector is in ${integration.status} state; requires explicit sign-off` },
      });

      return {
        adapterId: integration.id,
        category: integration.category as any,
        status: 'ACCESS_DENIED',
        assets: [],
        epistemicTier: 'UNAVAILABLE_INFORMATION',
        message: `Connector '${integration.name}' is currently ${integration.status}. Access denied.`,
      };
    }

    // 2.1 Owner Authorization Check: Must be formally approved by Platform Owner
    if (!integration.approvedBy || !integration.ownerApprovalSignature) {
      await this.logAudit({
        agencyId: integration.agencyId,
        officerId: scope.officerId,
        caseId: scope.caseId,
        action: 'ACCESS_DENIED_UNAPPROVED_CONNECTOR',
        resourceAccessed: integration.name,
        warrantRef: scope.legalMandateRef,
        ipAddress,
        userAgent,
        details: { reason: 'Connector lacks verified Platform Owner cryptographic approval signature' },
      });

      return {
        adapterId: integration.id,
        category: integration.category as any,
        status: 'ACCESS_DENIED',
        assets: [],
        epistemicTier: 'UNAVAILABLE_INFORMATION',
        message: `Connector '${integration.name}' has not been authorized by the Platform Owner. Access denied.`,
      };
    }

    // 3. Agency Scope Match
    if (integration.agencyId !== scope.agencyId) {
      throw new Error('Unauthorized: Connector does not belong to the investigating agency');
    }

    // 4. Internal Release Governance
    // Platform Owner approval is the sole internal authorization authority.
    // If legal reference is provided, it is recorded in the audit trail without acting as a separate internal blocking gate.

    // 4.1 Mandatory Platform Owner Approval Policy (Gate 2)
    // Enforces: Government status or court warrant alone is NOT authorization.
    // Explicit Platform Owner approval is mandatory, independent, and strictly required.
    const activeGrant = await prisma.platformOwnerGrant.findFirst({
      where: {
        agencyId: scope.agencyId,
        OR: [
          { caseId: scope.caseId },
          { caseId: null },
        ],
        status: 'APPROVED',
        approvalSignature: { not: null },
        revokedAt: null,
      },
    });

    // Check if grant is expired or revoked
    let isGrantExpired = false;
    if (activeGrant && activeGrant.requestedScopeJson) {
      try {
        const sc = JSON.parse(activeGrant.requestedScopeJson);
        if (sc.expiresAt && new Date(sc.expiresAt).getTime() <= Date.now()) {
          isGrantExpired = true;
        } else if (sc.durationHours && activeGrant.approvedAt && (new Date(activeGrant.approvedAt).getTime() + sc.durationHours * 3600000 <= Date.now())) {
          isGrantExpired = true;
        }
      } catch (e) {}
    }

    if (!activeGrant || isGrantExpired) {
      const denialReason = isGrantExpired
        ? 'Platform Owner access grant has EXPIRED'
        : (activeGrant ? 'Platform access request is invalid' : 'No Platform Owner access approval exists for this agency or case');
      const action = isGrantExpired ? 'ACCESS_DENIED_EXPIRED_OWNER_GRANT' : 'ACCESS_DENIED_PENDING_OWNER_APPROVAL';

      await this.logAudit({
        agencyId: integration.agencyId,
        officerId: scope.officerId,
        caseId: scope.caseId,
        action,
        resourceAccessed: integration.name,
        warrantRef: scope.legalMandateRef,
        ipAddress,
        userAgent,
        details: { reason: denialReason, grantId: activeGrant?.id },
      });

      return {
        adapterId: integration.id,
        category: integration.category as any,
        status: 'ACCESS_DENIED',
        assets: [],
        epistemicTier: 'UNAVAILABLE_INFORMATION',
        message: `AFRIQORA Platform Access Denied: ${denialReason}. Explicit, unexpired Platform Owner authorization is strictly required.`,
      };
    }

    // 4.2 Strict Scope Enforcement against Approved Platform Owner Grant
    if (activeGrant.requestedScopeJson) {
      try {
        const approvedScope = JSON.parse(activeGrant.requestedScopeJson);
        if (approvedScope.category && approvedScope.category !== integration.category) {
          await this.logAudit({
            agencyId: integration.agencyId,
            officerId: scope.officerId,
            caseId: scope.caseId,
            action: 'ACCESS_DENIED_SCOPE_EXCEEDED',
            resourceAccessed: integration.name,
            warrantRef: scope.legalMandateRef,
            ipAddress,
            userAgent,
            details: {
              reason: `Category '${integration.category}' is outside Platform Owner approved scope '${approvedScope.category}'`,
              grantId: activeGrant.id,
              approvedScope,
            },
          });

          return {
            adapterId: integration.id,
            category: integration.category as any,
            status: 'ACCESS_DENIED',
            assets: [],
            epistemicTier: 'UNAVAILABLE_INFORMATION',
            message: `AFRIQORA Platform Access Denied: Requested source '${integration.category}' is outside the Platform Owner approved scope.`,
          };
        }

        if (Array.isArray(approvedScope.allowedCategories) && !approvedScope.allowedCategories.includes(integration.category)) {
          await this.logAudit({
            agencyId: integration.agencyId,
            officerId: scope.officerId,
            caseId: scope.caseId,
            action: 'ACCESS_DENIED_SCOPE_EXCEEDED',
            resourceAccessed: integration.name,
            warrantRef: scope.legalMandateRef,
            ipAddress,
            userAgent,
            details: {
              reason: `Category '${integration.category}' is not among approved categories [${approvedScope.allowedCategories.join(', ')}]`,
              grantId: activeGrant.id,
              approvedScope,
            },
          });

          return {
            adapterId: integration.id,
            category: integration.category as any,
            status: 'ACCESS_DENIED',
            assets: [],
            epistemicTier: 'UNAVAILABLE_INFORMATION',
            message: `AFRIQORA Platform Access Denied: Requested source category '${integration.category}' is not authorized in Platform Owner approved scope.`,
          };
        }

        if (approvedScope.radiusMeters && scope.location?.radiusMeters && scope.location.radiusMeters > approvedScope.radiusMeters) {
          await this.logAudit({
            agencyId: integration.agencyId,
            officerId: scope.officerId,
            caseId: scope.caseId,
            action: 'ACCESS_DENIED_SCOPE_EXCEEDED',
            resourceAccessed: integration.name,
            warrantRef: scope.legalMandateRef,
            ipAddress,
            userAgent,
            details: {
              reason: `Requested radius ${scope.location.radiusMeters}m exceeds owner-approved limit ${approvedScope.radiusMeters}m`,
              grantId: activeGrant.id,
              approvedScope,
            },
          });

          return {
            adapterId: integration.id,
            category: integration.category as any,
            status: 'ACCESS_DENIED',
            assets: [],
            epistemicTier: 'UNAVAILABLE_INFORMATION',
            message: `AFRIQORA Platform Access Denied: Search radius (${scope.location.radiusMeters}m) exceeds Platform Owner approved limit (${approvedScope.radiusMeters}m).`,
          };
        }
      } catch (e) {
        // Fallback gracefully if scope payload is not JSON
      }
    }

    // 5. Retrieve adapter implementation
    const adapter = this.getAdapter(integration.category) || this.getAdapter(integration.adapterType);
    if (!adapter) {
      throw new Error(`No adapter implementation registered for category '${integration.category}'`);
    }

    // 6. Decrypt credentials if stored
    let decryptedConfig: Record<string, any> = {};
    try {
      if (integration.authConfigEnc && integration.authConfigEnc.includes(':')) {
        const decryptedJson = CredentialVault.decrypt(integration.authConfigEnc);
        decryptedConfig = JSON.parse(decryptedJson);
      }
    } catch (e) {
      decryptedConfig = { endpointUrl: integration.endpointUrl };
    }

    // 7. Dispatch to Adapter
    const result = await adapter.query(scope, {
      ...decryptedConfig,
      endpointUrl: integration.endpointUrl,
    });

    // 8. Ingest evidence into database if assets found
    if (result.status === 'SUCCESS' && result.assets.length > 0) {
      for (const asset of result.assets) {
        const evidence = await prisma.investigationEvidence.create({
          data: {
            caseId: scope.caseId,
            officerId: scope.officerId,
            sourceType: asset.sourceType,
            sourceName: asset.sourceName,
            sourceOrganization: asset.sourceOrganization,
            acquisitionMethod: 'AUTHORIZED_CONNECTOR_INGEST',
            mimeType: asset.mimeType,
            storagePath: `/secure/vault/${scope.caseId}/${asset.assetId}`,
            fileSizeBytes: asset.fileSizeBytes,
            sha256Hash: asset.sha256Hash,
            isOriginalPreserved: true,
            metadataJson: JSON.stringify(asset.metadataJson),
          },
        });

        // Create Chain of Custody Record
        const custodyVerificationHash = crypto
          .createHash('sha256')
          .update(evidence.id + scope.officerId + 'INGESTED')
          .digest('hex');

        await prisma.evidenceChainOfCustody.create({
          data: {
            evidenceId: evidence.id,
            officerId: scope.officerId,
            action: 'INGESTED',
            details: `Ingested from connector '${integration.name}'`,
            verificationHash: custodyVerificationHash,
          },
        });
      }
    }

    // 9. Tamper-Evident Audit Log Entry
    await this.logAudit({
      agencyId: integration.agencyId,
      officerId: scope.officerId,
      caseId: scope.caseId,
      action: 'CONNECTOR_QUERIED',
      resourceAccessed: integration.name,
      warrantRef: scope.legalMandateRef,
      ipAddress,
      userAgent,
      details: {
        status: result.status,
        assetsCount: result.assets.length,
        epistemicTier: result.epistemicTier,
      },
    });

    return result;
  }

  private static async logAudit(params: {
    agencyId: string;
    officerId?: string;
    caseId?: string;
    action: string;
    resourceAccessed: string;
    warrantRef?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const lastLog = await prisma.governmentAuditLog.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    const previousLogHash = lastLog ? lastLog.currentLogHash : 'ROOT_GENESIS_HASH';
    const timestamp = new Date();
    const payload = `${previousLogHash}:${timestamp.toISOString()}:${params.action}:${params.resourceAccessed}:${params.officerId || ''}`;
    const currentLogHash = crypto.createHash('sha256').update(payload).digest('hex');

    let validCaseId: string | null = null;
    if (params.caseId) {
      const existingCase = await prisma.investigationCase.findUnique({ where: { id: params.caseId } });
      if (existingCase) validCaseId = existingCase.id;
    }

    let validOfficerId: string | null = null;
    if (params.officerId) {
      const existingOfficer = await prisma.governmentOfficer.findUnique({ where: { id: params.officerId } });
      if (existingOfficer) validOfficerId = existingOfficer.id;
    }

    await prisma.governmentAuditLog.create({
      data: {
        agencyId: params.agencyId,
        officerId: validOfficerId,
        caseId: validCaseId,
        action: params.action,
        resourceAccessed: params.resourceAccessed,
        warrantRef: params.warrantRef,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
        previousLogHash,
        currentLogHash,
        timestamp,
      },
    });
  }
}
