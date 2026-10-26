/**
 * AFRIQORA Conflict Intelligence API Routes
 * Sub-module: Eastern DRC Mining Corridors & Armed Conflict Surveillance
 * Mounts at: /api/conflict/*
 * 
 * Strict Compliance:
 * - Module is LOCKED (403) by default.
 * - Activation requires explicit single Platform Owner authorization.
 * - All actions produce SHA-256 tamper-evident audit logs.
 */

import { Router } from 'express';
import { requireAuth, requirePlatformOwner, attachAuth } from '../../shared/auth.middleware';
import { ConflictController } from './conflict.controller';

const router = Router();

// 1. Module Status & Platform Owner Verification Notice
router.get('/status', attachAuth, ConflictController.getModuleStatus);

// 2. Strict Owner Authorization Gate
router.post('/activate', requireAuth, requirePlatformOwner, ConflictController.activateModule);
router.post('/deactivate', requireAuth, requirePlatformOwner, ConflictController.deactivateModule);

// 3. Eastern DRC Conflict Incidents (gated: returns 403 if inactive)
router.get('/incidents', attachAuth, ConflictController.getIncidents);
router.get('/incidents/:id', attachAuth, ConflictController.getIncidentById);

// 4. Satellite Observation Linkage (Sentinel-1 SAR / Sentinel-2 MSI cross-corroboration)
router.post('/incidents/:id/satellite', requireAuth, ConflictController.linkSatelliteObservation);

// 4a. Satellite Observation Pass Discovery (Copernicus CDSE OData catalogue over incident AOI)
router.get('/incidents/:id/satellite-passes', attachAuth, ConflictController.getIncidentSatellitePasses);

// 4b. Automated Satellite Surveillance & Physical Corroboration (Sentinel-1 SAR / Sentinel-2 Optical processing)
router.post('/incidents/:id/corroborate-satellite', requireAuth, ConflictController.corroborateSatelliteObservation);

// 5. Tamper-Evident Audit Ledger (Platform Owner Only)
router.get('/audit-logs', requireAuth, requirePlatformOwner, ConflictController.getAuditLogs);

export default router;
