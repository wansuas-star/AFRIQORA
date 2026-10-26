"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const copernicus_provider_1 = require("../satellite/providers/copernicus.provider");
const sentinel1_sar_1 = require("../satellite/pipelines/sentinel1.sar");
const sentinel2_optical_1 = require("../satellite/pipelines/sentinel2.optical");
const confidence_1 = require("../satellite/ml/confidence");
const drcConflictDataset_1 = require("./drcConflictDataset");
// Module state: strictly inactive by default until Platform Owner explicitly authorizes
let moduleState = {
    isActive: false,
    strictOwnerGateEnabled: true,
    surveillanceNotice: 'AFRIQORA Conflict Intelligence is currently LOCKED. Operational activation requires authenticated Platform Owner authorization.',
};
const auditLog = [
    {
        id: 'AUDIT_INIT_001',
        timestamp: new Date().toISOString(),
        actorEmail: 'SYSTEM_BOOTSTRAP',
        action: 'MODULE_INITIALIZED_LOCKED',
        details: 'Conflict Intelligence module initialized in default LOCKED state pending Platform Owner authorization.',
        sha256Signature: crypto_1.default.createHash('sha256').update('INIT_LOCKED_' + Date.now()).digest('hex'),
    },
];
let incidentsStore = [...drcConflictDataset_1.EASTERN_DRC_CONFLICT_INCIDENTS];
class ConflictController {
    static copernicus = new copernicus_provider_1.CopernicusCDSEProvider();
    static getPlatformOwnerEmail() {
        return (process.env.PLATFORM_OWNER_EMAIL || 'owner@afriqora.com').toLowerCase().trim();
    }
    static isPlatformOwner(req) {
        const user = req.user;
        if (!user || !user.email)
            return false;
        const ownerEmail = ConflictController.getPlatformOwnerEmail();
        return user.email.toLowerCase().trim() === ownerEmail || Boolean(user.isPlatformOwner);
    }
    static logAudit(actorEmail, action, details, targetIncidentId) {
        const timestamp = new Date().toISOString();
        const payload = `${timestamp}:${actorEmail}:${action}:${details}:${targetIncidentId || ''}`;
        const sha256Signature = crypto_1.default.createHash('sha256').update(payload).digest('hex');
        const entry = {
            id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp,
            actorEmail,
            action,
            targetIncidentId,
            details,
            sha256Signature,
        };
        auditLog.unshift(entry);
        return entry;
    }
    /**
     * Public/Authenticated: Get status of Conflict Intelligence Module
     */
    static async getModuleStatus(_req, res) {
        res.json({
            ok: true,
            module: 'AFRIQORA_CONFLICT_INTELLIGENCE_DRC',
            state: moduleState,
            totalIncidentsAvailable: incidentsStore.length,
            provincesMonitored: ['North Kivu', 'South Kivu', 'Ituri'],
            monitoredMiningCorridors: ['Rubaya Coltan', 'Mongbwalu Gold', 'Kamituga Gold', 'Rutshuru Virunga Buffer'],
            legalNotice: 'Conflict intelligence data is gathered under international human rights frameworks, OECD Due Diligence Guidance, and EU Open Space Data policies. Raw access requires Platform Owner authorization.',
        });
    }
    /**
     * Platform Owner Gate: Activate Conflict Intelligence Module
     */
    static async activateModule(req, res) {
        try {
            const user = req.user;
            const ownerEmail = ConflictController.getPlatformOwnerEmail();
            // Check if user is authenticated Platform Owner
            if (!ConflictController.isPlatformOwner(req)) {
                res.status(403).json({
                    ok: false,
                    code: 'UNAUTHORIZED_OWNER_GATE_REJECTED',
                    error: `Activation denied. Conflict Intelligence can ONLY be activated by the designated Platform Owner (${ownerEmail}).`,
                });
                return;
            }
            const { authorizationReason } = req.body || {};
            const nonce = crypto_1.default.randomBytes(16).toString('hex');
            const activationDate = new Date().toISOString();
            moduleState = {
                isActive: true,
                activationDate,
                authorizedByOwnerEmail: user.email,
                authorizationNonce: nonce,
                surveillanceNotice: `OPERATIONAL: Conflict Intelligence active under Platform Owner authorization. Session Nonce: ${nonce}.`,
                strictOwnerGateEnabled: true,
            };
            ConflictController.logAudit(user.email, 'ACTIVATE_CONFLICT_MODULE', `Platform Owner explicitly authorized Conflict Intelligence activation. Reason: ${authorizationReason || 'Operational verification'}`);
            res.json({
                ok: true,
                message: 'Conflict Intelligence module activated successfully by Platform Owner.',
                state: moduleState,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Platform Owner Gate: Deactivate Conflict Intelligence Module
     */
    static async deactivateModule(req, res) {
        try {
            const user = req.user;
            if (!ConflictController.isPlatformOwner(req)) {
                res.status(403).json({
                    ok: false,
                    code: 'UNAUTHORIZED_OWNER_GATE_REJECTED',
                    error: 'Deactivation denied. Requires Platform Owner credentials.',
                });
                return;
            }
            moduleState = {
                isActive: false,
                strictOwnerGateEnabled: true,
                surveillanceNotice: 'AFRIQORA Conflict Intelligence is currently LOCKED. Operational activation requires authenticated Platform Owner authorization.',
            };
            ConflictController.logAudit(user.email, 'DEACTIVATE_CONFLICT_MODULE', 'Platform Owner locked Conflict Intelligence module.');
            res.json({
                ok: true,
                message: 'Conflict Intelligence module locked and deactivated.',
                state: moduleState,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Retrieve Conflict Incidents
     * Strictly gated: returns 403 if module is inactive
     */
    static async getIncidents(req, res) {
        try {
            // Check if module is active
            if (!moduleState.isActive) {
                res.status(403).json({
                    ok: false,
                    code: 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL',
                    error: 'Conflict Intelligence module is inactive. Platform Owner explicit authorization is required to access operational intelligence.',
                    state: moduleState,
                });
                return;
            }
            const { province, territory, incidentType, severity, query, minConfidence } = req.query;
            let results = [...incidentsStore];
            if (province && typeof province === 'string') {
                const provStr = province.toLowerCase();
                results = results.filter(i => i.province.toLowerCase().includes(provStr));
            }
            if (territory && typeof territory === 'string') {
                const terrStr = territory.toLowerCase();
                results = results.filter(i => i.territory && i.territory.toLowerCase().includes(terrStr));
            }
            if (incidentType && typeof incidentType === 'string') {
                results = results.filter(i => i.incidentType === incidentType);
            }
            if (severity && typeof severity === 'string') {
                results = results.filter(i => i.severityLevel === severity);
            }
            if (minConfidence) {
                const minVal = parseFloat(String(minConfidence));
                if (!isNaN(minVal)) {
                    results = results.filter(i => {
                        const topConfidence = Math.max(...i.sources.map(s => s.admiraltyGrading.confidencePercent), 0);
                        return topConfidence >= minVal;
                    });
                }
            }
            if (query && typeof query === 'string') {
                const q = query.toLowerCase();
                results = results.filter(i => i.title.toLowerCase().includes(q) ||
                    i.locationName.toLowerCase().includes(q) ||
                    i.summary.toLowerCase().includes(q) ||
                    (i.mineralOrResourceImpact && i.mineralOrResourceImpact.toLowerCase().includes(q)));
            }
            const user = req.user;
            ConflictController.logAudit(user?.email || 'ANONYMOUS_QUERY', 'QUERY_INCIDENTS', `Retrieved ${results.length} conflict incidents with filters [prov: ${province || 'any'}, type: ${incidentType || 'any'}]`);
            res.json({
                ok: true,
                count: results.length,
                incidents: results,
                moduleState,
                admiraltyScaleLegend: {
                    reliability: {
                        A: 'Completely reliable (tested over time, zero doubt)',
                        B: 'Usually reliable (some doubt, mostly verified)',
                        C: 'Fairly reliable (average credibility)',
                        D: 'Not usually reliable',
                        E: 'Unreliable',
                        F: 'Reliability cannot be judged',
                    },
                    credibility: {
                        1: 'Confirmed by independent physical/satellite sources',
                        2: 'Probably true (multiple independent accounts)',
                        3: 'Possibly true (credible single source)',
                        4: 'Doubtful',
                        5: 'Improbable',
                        6: 'Truth cannot be judged',
                    },
                },
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Retrieve single Conflict Incident by ID
     */
    static async getIncidentById(req, res) {
        try {
            if (!moduleState.isActive) {
                res.status(403).json({
                    ok: false,
                    code: 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL',
                    error: 'Conflict Intelligence module is inactive. Platform Owner authorization required.',
                });
                return;
            }
            const { id } = req.params;
            const incident = incidentsStore.find(i => i.id === id);
            if (!incident) {
                res.status(404).json({ ok: false, error: `Conflict incident with ID '${id}' not found.` });
                return;
            }
            res.json({
                ok: true,
                incident,
                satelliteEvidenceSummary: {
                    totalSatellitePasses: incident.satelliteObservations.length,
                    radarSARCount: incident.satelliteObservations.filter(s => s.platform.includes('SAR')).length,
                    opticalMSICount: incident.satelliteObservations.filter(s => s.platform.includes('MSI')).length,
                    physicallyCorroborated: incident.satelliteObservations.every(s => s.corroborationStatus === 'PHYSICALLY_CORROBORATED'),
                },
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Link satellite observation to conflict incident
     */
    static async linkSatelliteObservation(req, res) {
        try {
            if (!moduleState.isActive) {
                res.status(403).json({
                    ok: false,
                    code: 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL',
                    error: 'Conflict module inactive.',
                });
                return;
            }
            const rawId = req.params.id;
            const id = typeof rawId === 'string' ? rawId : (Array.isArray(rawId) ? rawId[0] : undefined);
            const incident = id ? incidentsStore.find(i => i.id === id) : null;
            if (!incident || !id) {
                res.status(404).json({ ok: false, error: 'Incident not found' });
                return;
            }
            const { observationId, platform, observationDate, deltaIndexType, deltaMagnitude, areaHectares, corroborationStatus } = req.body;
            if (!observationId || !platform || !deltaIndexType) {
                res.status(400).json({ ok: false, error: 'observationId, platform, and deltaIndexType are required.' });
                return;
            }
            const link = {
                observationId,
                platform,
                observationDate: observationDate || new Date().toISOString().slice(0, 10),
                deltaIndexType,
                deltaMagnitude: typeof deltaMagnitude === 'number' ? deltaMagnitude : 0,
                areaHectares: typeof areaHectares === 'number' ? areaHectares : 0,
                corroborationStatus: corroborationStatus || 'PHYSICALLY_CORROBORATED',
                integrityHashSha256: crypto_1.default.createHash('sha256').update(`${observationId}:${platform}:${Date.now()}`).digest('hex'),
            };
            incident.satelliteObservations.push(link);
            incident.updatedAt = new Date().toISOString();
            const user = req.user;
            ConflictController.logAudit(user?.email || 'ANALYST', 'LINK_SATELLITE_EVIDENCE', `Linked ${platform} pass ${observationId} to conflict incident ${id}`, id);
            res.status(201).json({
                ok: true,
                message: 'Satellite observation linked to conflict incident successfully.',
                incident,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Discover satellite observation passes (Copernicus CDSE OData catalogue) over a conflict incident AOI
     */
    static async getIncidentSatellitePasses(req, res) {
        try {
            if (!moduleState.isActive) {
                res.status(403).json({
                    ok: false,
                    code: 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL',
                    error: 'Conflict Intelligence module is inactive. Platform Owner authorization required.',
                });
                return;
            }
            const rawId = req.params.id;
            const id = typeof rawId === 'string' ? rawId : (Array.isArray(rawId) ? rawId[0] : undefined);
            const incident = id ? incidentsStore.find(i => i.id === id) : null;
            if (!incident || !id) {
                res.status(404).json({ ok: false, error: `Conflict incident with ID '${id}' not found.` });
                return;
            }
            const { days = '90', platform } = req.query;
            const daysNum = Math.max(7, Math.min(365, parseInt(String(days), 10) || 90));
            const end = new Date();
            const start = new Date(end.getTime() - daysNum * 24 * 3600 * 1000);
            const bbox = incident.bbox;
            const scenes = await ConflictController.copernicus.searchScenes(bbox, { start, end }, platform ? String(platform) : undefined);
            const isRealData = scenes.some(s => s.id && !s.id.includes('MOCK'));
            const dataSource = isRealData ? 'COPERNICUS_ODATA_CATALOGUE' : 'CALIBRATED_BENCHMARK_GRID';
            const sarScenes = scenes.filter(s => s.platform.startsWith('Sentinel-1'));
            const opticalScenes = scenes.filter(s => s.platform.startsWith('Sentinel-2'));
            res.json({
                ok: true,
                incidentId: incident.id,
                incidentTitle: incident.title,
                locationName: incident.locationName,
                bbox: incident.bbox,
                searchWindow: {
                    start: start.toISOString().slice(0, 10),
                    end: end.toISOString().slice(0, 10),
                    days: daysNum,
                },
                provenance: {
                    isRealData,
                    dataSource,
                    provider: 'copernicus_cdse',
                    totalScenesDiscovered: scenes.length,
                    sarPassCount: sarScenes.length,
                    opticalPassCount: opticalScenes.length,
                },
                scenes,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    /**
     * Automated Satellite Surveillance & Physical Corroboration for Conflict Incident
     * Executes Sentinel-1 SAR and/or Sentinel-2 Optical pipelines over the incident's bounding box.
     */
    static async corroborateSatelliteObservation(req, res) {
        try {
            if (!moduleState.isActive) {
                res.status(403).json({
                    ok: false,
                    code: 'CONFLICT_MODULE_INACTIVE_AWAITING_OWNER_APPROVAL',
                    error: 'Conflict Intelligence module is inactive. Platform Owner explicit authorization required.',
                });
                return;
            }
            const rawId = req.params.id;
            const id = typeof rawId === 'string' ? rawId : (Array.isArray(rawId) ? rawId[0] : undefined);
            const incident = id ? incidentsStore.find(i => i.id === id) : null;
            if (!incident || !id) {
                res.status(404).json({ ok: false, error: `Conflict incident with ID '${id}' not found.` });
                return;
            }
            const { sensorType = 'BOTH', comparisonWindowDays = 60, thresholdDb = 2.5 } = req.body || {};
            const windowDays = Math.max(14, Math.min(180, Number(comparisonWindowDays) || 60));
            const bbox = incident.bbox;
            const now = new Date();
            const baselineDate = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);
            const d1Str = baselineDate.toISOString().slice(0, 10).replace(/-/g, '');
            const d2Str = now.toISOString().slice(0, 10).replace(/-/g, '');
            const newLinks = [];
            let maxChangeMagnitude = 0;
            let totalCorroboratedAreaHa = 0;
            // 1. Sentinel-1 SAR Pipeline Processing (Decoupled)
            if (sensorType === 'SAR' || sensorType === 'BOTH') {
                const [beforeSAR, afterSAR] = await Promise.all([
                    ConflictController.copernicus.fetchSARScene(`S1A_IW_${d1Str}`, bbox),
                    ConflictController.copernicus.fetchSARScene(`S1A_IW_${d2Str}`, bbox),
                ]);
                const sarDiff = sentinel1_sar_1.Sentinel1SARPipeline.computeSARDifference(beforeSAR.vvGridDb, afterSAR.vvGridDb, Number(thresholdDb) || 2.5);
                const isRealSAR = Boolean(beforeSAR.isRealData || afterSAR.isRealData);
                const sarDataSource = isRealSAR ? 'COPERNICUS_CDSE_LIVE_DOWNLOAD' : 'CALIBRATED_BENCHMARK_GRID';
                const sarMagnitude = Math.abs(sarDiff.meanDeltaDb);
                const sarArea = sarDiff.positiveAnomaliesHectares;
                const sarCorroborated = sarArea > 0.02 || sarMagnitude >= 2.0;
                const sarLink = {
                    observationId: `S1A_IW_GRDH_${d2Str}_${incident.id.replace(/-/g, '_')}`,
                    platform: 'Sentinel-1A SAR',
                    observationDate: now.toISOString().slice(0, 10),
                    deltaIndexType: 'RADAR_BACKSCATTER_DB',
                    deltaMagnitude: Number(sarDiff.meanDeltaDb.toFixed(2)),
                    areaHectares: Number(sarArea.toFixed(2)),
                    corroborationStatus: sarCorroborated ? 'PHYSICALLY_CORROBORATED' : 'CONSISTENT_WITH_REPORTS',
                    integrityHashSha256: crypto_1.default.createHash('sha256').update(`SAR:${incident.id}:${sarDiff.meanDeltaDb}:${sarArea}:${Date.now()}`).digest('hex'),
                    isRealData: isRealSAR,
                    dataSource: sarDataSource,
                    metrics: {
                        meanDeltaDb: sarDiff.meanDeltaDb,
                        positiveAnomaliesHectares: sarDiff.positiveAnomaliesHectares,
                        negativeAnomaliesHectares: sarDiff.negativeAnomaliesHectares,
                        anomalyPixelCount: sarDiff.anomalyPixelCount,
                    },
                    notes: sarCorroborated
                        ? `C-band radar backscatter anomaly detected across ${sarArea.toFixed(2)} ha (mean delta: ${sarDiff.meanDeltaDb.toFixed(2)} dB), corroborating structural/excavation ground interference.`
                        : 'Radar backscatter variation within normal operational tolerances.',
                };
                newLinks.push(sarLink);
                maxChangeMagnitude = Math.max(maxChangeMagnitude, sarMagnitude / 10);
                totalCorroboratedAreaHa += sarArea;
            }
            // 2. Sentinel-2 Optical Pipeline Processing (Decoupled)
            if (sensorType === 'OPTICAL' || sensorType === 'BOTH') {
                const [beforeOptical, afterOptical] = await Promise.all([
                    ConflictController.copernicus.fetchOpticalScene(`S2A_MSI_${d1Str}`, bbox),
                    ConflictController.copernicus.fetchOpticalScene(`S2A_MSI_${d2Str}`, bbox),
                ]);
                const optDiff = sentinel2_optical_1.Sentinel2OpticalPipeline.computeNDVIDifference(beforeOptical.ndviGrid, afterOptical.ndviGrid, 0.15);
                const isRealOpt = Boolean(beforeOptical.isRealData || afterOptical.isRealData);
                const optDataSource = isRealOpt ? 'COPERNICUS_CDSE_LIVE_DOWNLOAD' : 'CALIBRATED_BENCHMARK_GRID';
                const optMagnitude = Math.abs(optDiff.meanDeltaNdvi);
                const optArea = optDiff.vegetationLossHectares;
                const optCorroborated = optArea > 0.02 || optMagnitude >= 0.15;
                const opticalLink = {
                    observationId: `S2A_MSI_L2A_${d2Str}_${incident.id.replace(/-/g, '_')}`,
                    platform: 'Sentinel-2A MSI',
                    observationDate: now.toISOString().slice(0, 10),
                    deltaIndexType: 'NDVI_VEGETATION_LOSS',
                    deltaMagnitude: Number(optDiff.meanDeltaNdvi.toFixed(3)),
                    areaHectares: Number(optArea.toFixed(2)),
                    corroborationStatus: optCorroborated ? 'PHYSICALLY_CORROBORATED' : 'CONSISTENT_WITH_REPORTS',
                    integrityHashSha256: crypto_1.default.createHash('sha256').update(`OPT:${incident.id}:${optDiff.meanDeltaNdvi}:${optArea}:${Date.now()}`).digest('hex'),
                    isRealData: isRealOpt,
                    dataSource: optDataSource,
                    metrics: {
                        meanDeltaNdvi: optDiff.meanDeltaNdvi,
                        vegetationLossHectares: optDiff.vegetationLossHectares,
                        vegetationGainHectares: optDiff.vegetationGainHectares,
                        clearedPixelCount: optDiff.clearedPixelCount,
                        cloudCoverPercent: afterOptical.cloudCover,
                    },
                    notes: optCorroborated
                        ? `Multispectral NDVI loss detected across ${optArea.toFixed(2)} ha (mean NDVI delta: ${optDiff.meanDeltaNdvi.toFixed(3)}), corroborating vegetative surface disruption.`
                        : 'Multispectral canopy reflection consistent with baseline stability.',
                };
                newLinks.push(opticalLink);
                maxChangeMagnitude = Math.max(maxChangeMagnitude, optMagnitude);
                totalCorroboratedAreaHa += optArea;
            }
            // 3. Register links to incident store
            incident.satelliteObservations.push(...newLinks);
            incident.updatedAt = now.toISOString();
            // 4. Dynamic Admiralty Intelligence Scale Evaluation
            const hasPhysicalEvidence = newLinks.some(l => l.corroborationStatus === 'PHYSICALLY_CORROBORATED');
            let admiraltyUpgradeNotice = 'Admiralty grade maintained at baseline.';
            if (hasPhysicalEvidence && incident.sources.length > 0) {
                const primarySource = incident.sources[0];
                const oldScore = primarySource.admiraltyGrading.compositeScore;
                const oldConf = primarySource.admiraltyGrading.confidencePercent;
                primarySource.admiraltyGrading.informationCredibility = '1';
                primarySource.admiraltyGrading.compositeScore = `${primarySource.admiraltyGrading.sourceReliability}1`;
                const confCalc = confidence_1.ConfidenceCalculator.calculateConfidence({
                    resolutionMeters: 10.0,
                    observationCount: incident.satelliteObservations.length,
                    hasMultiSensorAgreement: newLinks.length > 1,
                    changeMagnitude: maxChangeMagnitude,
                });
                const newConfidence = Math.max(oldConf, Math.round(confCalc.score * 100));
                primarySource.admiraltyGrading.confidencePercent = newConfidence;
                primarySource.admiraltyGrading.assessmentNotes = `Admiralty credibility elevated to Grade 1 (Confirmed by independent physical Earth observation pass). Corroborated area: ${totalCorroboratedAreaHa.toFixed(2)} ha.`;
                admiraltyUpgradeNotice = `Admiralty score upgraded from ${oldScore} (${oldConf}%) to ${primarySource.admiraltyGrading.compositeScore} (${newConfidence}%) based on physical satellite evidence.`;
            }
            // 5. Audit Log (Platform Owner & Analyst Traceability)
            const user = req.user;
            ConflictController.logAudit(user?.email || 'ANALYST', 'CORROBORATE_SATELLITE_EVIDENCE', `Corroborated incident ${incident.id} using ${sensorType} pipeline. Linked ${newLinks.length} observations. ${admiraltyUpgradeNotice}`, incident.id);
            res.status(201).json({
                ok: true,
                incidentId: incident.id,
                incidentTitle: incident.title,
                admiraltyUpgradeNotice,
                generatedObservations: newLinks,
                incident,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
    static async getAuditLogs(req, res) {
        try {
            if (!ConflictController.isPlatformOwner(req)) {
                res.status(403).json({
                    ok: false,
                    error: 'Audit logs restricted to Platform Owner.',
                });
                return;
            }
            res.json({
                ok: true,
                totalEntries: auditLog.length,
                logs: auditLog,
            });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
}
exports.ConflictController = ConflictController;
