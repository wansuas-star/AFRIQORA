/**
 * AFRIQORA Government Investigative Intelligence API Routes
 * Mounts: /api/gov/*
 * Protected by strict Authentication, Government Officer Verification, and Platform Owner Guards
 */

import { Router } from 'express';
import { requireAuth, requireOfficer, requirePlatformOwner } from '../../shared/auth.middleware';
import { GovernmentController } from './government.controller';

const router = Router();

// Case Dossier Management (Officer Clearance Required)
router.get('/cases', requireAuth, requireOfficer, GovernmentController.listCases);
router.post('/cases', requireAuth, requireOfficer, GovernmentController.createCase);
router.get('/cases/:id', requireAuth, requireOfficer, GovernmentController.getCaseDossier);

// Automated Multi-Source Ingestion (Officer Clearance Required)
router.post('/cases/:id/query-sources', requireAuth, requireOfficer, GovernmentController.queryAuthorizedSources);

// Human-in-the-Loop Reports & Cryptographic Sealing (Officer Clearance Required)
router.post('/cases/:id/reports', requireAuth, requireOfficer, GovernmentController.draftReport);
router.post('/reports/:reportId/seal', requireAuth, requireOfficer, GovernmentController.sealReport);

// Audit & Compliance Ledger (Officer Clearance Required)
router.get('/audit-logs', requireAuth, requireOfficer, GovernmentController.getAuditLogs);

// Platform-Level Government Access Requests & Decision Lifecycle
router.post('/access-requests', requireAuth, requireOfficer, GovernmentController.submitAccessRequest);
router.get('/access-requests', requireAuth, GovernmentController.listAccessRequests);
router.post('/access-requests/:id/approve', requireAuth, requirePlatformOwner, GovernmentController.approveAccessRequest);
router.post('/access-requests/:id/reject', requireAuth, requirePlatformOwner, GovernmentController.rejectAccessRequest);
router.post('/access-requests/:id/revoke', requireAuth, requirePlatformOwner, GovernmentController.revokeAccessGrant);

// Integration Catalog & Owner Approval Lifecycle
router.get('/integrations', requireAuth, GovernmentController.listIntegrations);
router.post('/integrations/:id/approve-and-activate', requireAuth, requirePlatformOwner, GovernmentController.approveAndActivateIntegration);
router.post('/integrations/:id/revoke', requireAuth, requirePlatformOwner, GovernmentController.revokeIntegration);

export default router;
