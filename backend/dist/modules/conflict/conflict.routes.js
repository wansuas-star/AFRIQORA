"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../shared/auth.middleware");
const conflict_controller_1 = require("./conflict.controller");
const router = (0, express_1.Router)();
// 1. Module Status & Platform Owner Verification Notice
router.get('/status', auth_middleware_1.attachAuth, conflict_controller_1.ConflictController.getModuleStatus);
// 2. Strict Owner Authorization Gate
router.post('/activate', auth_middleware_1.requireAuth, auth_middleware_1.requirePlatformOwner, conflict_controller_1.ConflictController.activateModule);
router.post('/deactivate', auth_middleware_1.requireAuth, auth_middleware_1.requirePlatformOwner, conflict_controller_1.ConflictController.deactivateModule);
// 3. Eastern DRC Conflict Incidents (gated: returns 403 if inactive)
router.get('/incidents', auth_middleware_1.attachAuth, conflict_controller_1.ConflictController.getIncidents);
router.get('/incidents/:id', auth_middleware_1.attachAuth, conflict_controller_1.ConflictController.getIncidentById);
// 4. Satellite Observation Linkage (Sentinel-1 SAR / Sentinel-2 MSI cross-corroboration)
router.post('/incidents/:id/satellite', auth_middleware_1.requireAuth, conflict_controller_1.ConflictController.linkSatelliteObservation);
// 4a. Satellite Observation Pass Discovery (Copernicus CDSE OData catalogue over incident AOI)
router.get('/incidents/:id/satellite-passes', auth_middleware_1.attachAuth, conflict_controller_1.ConflictController.getIncidentSatellitePasses);
// 4b. Automated Satellite Surveillance & Physical Corroboration (Sentinel-1 SAR / Sentinel-2 Optical processing)
router.post('/incidents/:id/corroborate-satellite', auth_middleware_1.requireAuth, conflict_controller_1.ConflictController.corroborateSatelliteObservation);
// 5. Tamper-Evident Audit Ledger (Platform Owner Only)
router.get('/audit-logs', auth_middleware_1.requireAuth, auth_middleware_1.requirePlatformOwner, conflict_controller_1.ConflictController.getAuditLogs);
exports.default = router;
