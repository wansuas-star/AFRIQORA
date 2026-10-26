import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Satellite,
  CheckCircle,
  Search,
  Compass,
  FileText,
  MapPin,
  Award,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { conflictApi } from '../../services/api';

export interface AdmiraltyGrading {
  sourceReliability: string;
  informationCredibility: string;
  compositeScore: string;
  confidencePercent: number;
  assessmentNotes: string;
}

export interface SatelliteObservationLink {
  observationId: string;
  platform: string;
  observationDate: string;
  deltaIndexType: string;
  deltaMagnitude: number;
  areaHectares: number;
  corroborationStatus: string;
  integrityHashSha256: string;
  isRealData?: boolean;
  dataSource?: string;
  notes?: string;
}

export interface ConflictIncident {
  id: string;
  title: string;
  country: string;
  province: string;
  territory?: string;
  locationName: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  bbox: [number, number, number, number];
  incidentDate: string;
  incidentType: string;
  severityLevel: string;
  summary: string;
  strategicContext: string;
  mineralOrResourceImpact?: string;
  reportedPartiesInvolved: string[];
  sources: Array<{
    sourceName: string;
    sourceType: string;
    reportingDate: string;
    verifiableDocumentRef?: string;
    admiraltyGrading: AdmiraltyGrading;
  }>;
  satelliteObservations: SatelliteObservationLink[];
  createdAt: string;
  updatedAt: string;
}

export const ConflictIntelligenceView: React.FC = () => {
  const { user } = useAuth();

  // Platform state & Data
  const [moduleState, setModuleState] = useState<any>(null);
  const [incidents, setIncidents] = useState<ConflictIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<ConflictIncident | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // Modals
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);
  const [activationReason, setActivationReason] = useState<string>('Authorized Eastern DRC Strategic Mineral Supply Chain Surveillance');
  
  const [isCorroborateModalOpen, setIsCorroborateModalOpen] = useState<boolean>(false);
  const [corroborateSensor, setCorroborateSensor] = useState<'BOTH' | 'SAR' | 'OPTICAL'>('BOTH');
  const [corroborateDays, setCorroborateDays] = useState<number>(60);
  const [lastCorroborationResult, setLastCorroborationResult] = useState<any>(null);

  const [discoveredScenes, setDiscoveredScenes] = useState<any[]>([]);
  const [isPassesModalOpen, setIsPassesModalOpen] = useState<boolean>(false);
  const [passesProvenance, setPassesProvenance] = useState<any>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const isOwner = Boolean(user?.isPlatformOwner || user?.email?.toLowerCase().includes('owner'));

  // Initial load
  useEffect(() => {
    fetchModuleData();
  }, []);

  const fetchModuleData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusRes = await conflictApi.getStatus();
      setModuleState(statusRes.state);

      if (statusRes.state?.isActive) {
        const incidentsRes = await conflictApi.getIncidents();
        setIncidents(incidentsRes.incidents || []);
        if (incidentsRes.incidents?.length > 0 && !selectedIncident) {
          setSelectedIncident(incidentsRes.incidents[0]);
        }
      } else {
        setIncidents([]);
        setSelectedIncident(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conflict intelligence status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await conflictApi.activate(activationReason);
      setModuleState(res.state);
      setIsActivationModalOpen(false);
      setSuccessNotice('Conflict Intelligence successfully activated under Platform Owner authority.');
      await fetchModuleData();
    } catch (err: any) {
      setError(err.message || 'Platform Owner activation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to lock the Conflict Intelligence module? Sensitive intelligence endpoints will be re-locked.')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await conflictApi.deactivate();
      setModuleState(res.state);
      setSuccessNotice('Conflict Intelligence module successfully locked.');
      setSelectedIncident(null);
      setIncidents([]);
    } catch (err: any) {
      setError(err.message || 'Deactivation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscoverPasses = async (incident: ConflictIncident) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await conflictApi.getSatellitePasses(incident.id, 90);
      setDiscoveredScenes(res.scenes || []);
      setPassesProvenance(res.provenance);
      setIsPassesModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to discover satellite passes from Copernicus OData catalogue.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorroborate = async () => {
    if (!selectedIncident) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await conflictApi.corroborateSatellite(selectedIncident.id, {
        sensorType: corroborateSensor,
        comparisonWindowDays: corroborateDays,
      });
      setLastCorroborationResult(res);
      setSelectedIncident(res.incident);
      // Update in list
      setIncidents(prev => prev.map(i => i.id === res.incident.id ? res.incident : i));
      setSuccessNotice(res.admiraltyUpgradeNotice || 'Satellite observation linked successfully.');
      setIsCorroborateModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Physical satellite corroboration failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAuditLogs = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await conflictApi.getAuditLogs();
      setAuditLogs(res.logs || []);
      setIsAuditModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Restricted to Platform Owner.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(i => {
    const matchQuery = !searchQuery || (
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.mineralOrResourceImpact && i.mineralOrResourceImpact.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const matchProvince = selectedProvince === 'ALL' || i.province.toUpperCase().includes(selectedProvince);
    const matchSeverity = selectedSeverity === 'ALL' || i.severityLevel === selectedSeverity;
    return matchQuery && matchProvince && matchSeverity;
  });

  const isActive = Boolean(moduleState?.isActive);

  return (
    <div className="space-y-4">
      {/* Module Title & Owner Security Bar */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isActive
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-950/40 text-white'
                : 'bg-gradient-to-tr from-amber-600 to-rose-600 shadow-rose-950/40 text-white'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                  Eastern DRC Mining Corridors & Armed Conflict Surveillance
                </h2>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}>
                  {isActive ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{isActive ? 'OPERATIONAL' : 'LOCKED - OWNER APPROVAL REQUIRED'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                OECD Due Diligence Compliance • UN Group of Experts Corroboration • Sentinel-1 SAR & Sentinel-2 MSI Multi-Sensor Verification
              </p>
            </div>
          </div>

          {/* Platform Owner Activation / Control Button */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {isActive ? (
              <>
                {isOwner && (
                  <button
                    onClick={handleViewAuditLogs}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audit Ledger</span>
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handleDeactivate}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Module</span>
                  </button>
                )}
              </>
            ) : (
              isOwner ? (
                <button
                  onClick={() => setIsActivationModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Authorize Operational Session</span>
                </button>
              ) : (
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl">
                  Platform Owner Authorization Required
                </div>
              )
            )}
            <button
              onClick={fetchModuleData}
              disabled={isLoading}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Operational Status / Session Nonce Sub-banner */}
        {isActive && moduleState?.authorizationNonce && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-bold">ACTIVE SESSION:</span>
              <span>Nonce: {moduleState.authorizationNonce}</span>
            </div>
            <div>
              Authorized by: <span className="text-slate-200">{moduleState.authorizedByOwnerEmail}</span> • {new Date(moduleState.activationDate).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Global Notice / Error Alerts */}
      {successNotice && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* When Module is LOCKED */}
      {!isActive ? (
        <div className="bg-[#0b1120]/70 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-base font-bold text-white">AFRIQORA Conflict Intelligence is Locked</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with international conflict sensitivity regulations, OECD Due Diligence guidance, and platform governance, raw armed conflict tracking and satellite corroboration feeds are gated by default.
            </p>
            <p className="text-xs text-amber-300/80 font-mono">
              Operational unlocking strictly requires Platform Owner explicit authorization.
            </p>
          </div>

          {isOwner ? (
            <button
              onClick={() => setIsActivationModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Authorize & Unlock Operational Surveillance</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Contact Platform Owner to request operational intelligence activation</span>
            </div>
          )}
        </div>
      ) : (
        /* When Module is ACTIVE: Operational Surveillance Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Incidents Directory & Filter */}
          <div className="lg:col-span-5 space-y-3">
            {/* Filter Bar */}
            <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-3 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concessions, coltan pits, corridors..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Province Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Province:</span>
                {['ALL', 'NORTH KIVU', 'SOUTH KIVU', 'ITURI'].map((prov) => (
                  <button
                    key={prov}
                    onClick={() => setSelectedProvince(prov)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                      selectedProvince === prov
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    {prov === 'ALL' ? 'All' : prov.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Severity Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Severity:</span>
                {['ALL', 'CRITICAL', 'ELEVATED', 'MONITORING'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                      selectedSeverity === sev
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev === 'ALL' ? 'All' : sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Incidents List Cards */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredIncidents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-xl bg-slate-900/50">
                  No conflict incidents match your filter.
                </div>
              ) : (
                filteredIncidents.map((inc) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  const topAdmiralty = inc.sources?.[0]?.admiraltyGrading;
                  const hasPhysicalPass = inc.satelliteObservations?.some(s => s.corroborationStatus === 'PHYSICALLY_CORROBORATED');

                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                          : 'bg-[#0d1424]/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                              {inc.id}
                            </span>
                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                              inc.severityLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {inc.severityLevel}
                            </span>
                            {hasPhysicalPass && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Satellite className="w-2.5 h-2.5" />
                                <span>Corroborated</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {inc.title}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{inc.locationName} ({inc.province})</span>
                          </div>
                        </div>

                        {/* Admiralty Score Badge */}
                        {topAdmiralty && (
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 inline-block font-mono">
                              {topAdmiralty.compositeScore}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {topAdmiralty.confidencePercent}% conf
                            </div>
                          </div>
                        )}
                      </div>

                      {inc.mineralOrResourceImpact && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-amber-300/80 flex items-center gap-1.5">
                          <Award className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Supply Impact: {inc.mineralOrResourceImpact}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Incident Operational Dossier */}
          <div className="lg:col-span-7 space-y-3">
            {selectedIncident ? (
              <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
                {lastCorroborationResult && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                    <span>{lastCorroborationResult.admiraltyUpgradeNotice}</span>
                    <button onClick={() => setLastCorroborationResult(null)} className="text-emerald-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                      <span>{selectedIncident.province}, {selectedIncident.territory || 'DRC'}</span>
                      <span>•</span>
                      <span>Incident Date: {selectedIncident.incidentDate}</span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1 leading-snug">
                      {selectedIncident.title}
                    </h3>
                    <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedIncident.locationName} [Coords: {selectedIncident.coordinates.lat.toFixed(3)}, {selectedIncident.coordinates.lon.toFixed(3)}]</span>
                    </div>
                  </div>

                  {/* Satellite Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDiscoverPasses(selectedIncident)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Discover Passes</span>
                    </button>
                    <button
                      onClick={() => setIsCorroborateModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                    >
                      <Satellite className="w-3.5 h-3.5" />
                      <span>Corroborate</span>
                    </button>
                  </div>
                </div>

                {/* Strategic Summary & Mineral Supply Impact */}
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="font-semibold text-slate-200">Incident Intelligence Summary:</div>
                  <p>{selectedIncident.summary}</p>
                  <p className="text-slate-400 pt-1 border-t border-slate-800/60">
                    <strong className="text-slate-300">Strategic Supply Context: </strong>
                    {selectedIncident.strategicContext}
                  </p>
                  {selectedIncident.reportedPartiesInvolved?.length > 0 && (
                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5 flex-wrap">
                      <strong className="text-slate-300">Reported Actors: </strong>
                      {selectedIncident.reportedPartiesInvolved.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* NATO / Admiralty Intelligence Scale Assessment */}
                {selectedIncident.sources?.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          NATO / Admiralty Intelligence Scale Rating
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                        Composite: {selectedIncident.sources[0].admiraltyGrading.compositeScore}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Source Reliability (A–F):</span>
                        <span className="text-slate-200 font-bold">
                          Grade {selectedIncident.sources[0].admiraltyGrading.sourceReliability}
                        </span>
                        <span className="text-slate-400 block text-[10px] mt-0.5">
                          {selectedIncident.sources[0].admiraltyGrading.sourceReliability === 'A' ? 'Completely reliable (multi-agency)' : 'Usually reliable'}
                        </span>
                      </div>
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Information Credibility (1–6):</span>
                        <span className="text-emerald-400 font-bold">
                          Grade {selectedIncident.sources[0].admiraltyGrading.informationCredibility}
                        </span>
                        <span className="text-slate-400 block text-[10px] mt-0.5">
                          {selectedIncident.sources[0].admiraltyGrading.informationCredibility === '1'
                            ? 'Confirmed by independent physical Earth observation'
                            : 'Probably true (multiple corroborating sources)'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 pt-1">
                      <strong>Assessment Notes: </strong>
                      {selectedIncident.sources[0].admiraltyGrading.assessmentNotes}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Source Document: {selectedIncident.sources[0].sourceName} ({selectedIncident.sources[0].verifiableDocumentRef || 'Ref Verified'})
                    </div>
                  </div>
                )}

                {/* Linked Satellite Observations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Satellite className="w-4 h-4 text-cyan-400" />
                      <span>Linked Physical Satellite Evidence ({selectedIncident.satelliteObservations?.length || 0})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Decoupled Sentinel-1 SAR & Sentinel-2 Optical
                    </span>
                  </div>

                  {(!selectedIncident.satelliteObservations || selectedIncident.satelliteObservations.length === 0) ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      No satellite passes linked yet. Click "Corroborate" above to run automated SAR/Optical differencing.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedIncident.satelliteObservations.map((obs, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{obs.platform}</span>
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                obs.corroborationStatus === 'PHYSICALLY_CORROBORATED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}>
                                {obs.corroborationStatus}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{obs.observationDate}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                            <div>
                              <span className="text-slate-500 block text-[9px]">INDEX TYPE</span>
                              <span>{obs.deltaIndexType}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px]">DELTA MAGNITUDE</span>
                              <span className="text-cyan-400 font-bold">{obs.deltaMagnitude}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px]">SURFACE DISTURBANCE</span>
                              <span className="text-amber-400 font-bold">{obs.areaHectares} ha</span>
                            </div>
                          </div>

                          {obs.notes && (
                            <div className="text-[11px] text-slate-400 leading-normal">
                              {obs.notes}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-850">
                            <span>Source: {obs.dataSource || 'COPERNICUS_CDSE_LIVE_DOWNLOAD'}</span>
                            <span title={obs.integrityHashSha256}>
                              SHA-256: {obs.integrityHashSha256?.slice(0, 16)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/40">
                Select an incident on the left to inspect its intelligence dossier.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Platform Owner Activation */}
      {isActivationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-amber-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Unlock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Platform Owner Operational Authorization</h3>
              </div>
              <button onClick={() => setIsActivationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                You are about to activate the AFRIQORA Eastern DRC Conflict Intelligence surveillance module. This will generate a cryptographically signed operational session nonce and record an immutable audit entry.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Authorization Reason / Investigative Mandate:
                </label>
                <textarea
                  value={activationReason}
                  onChange={(e) => setActivationReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsActivationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                <span>Confirm & Activate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Corroborate Satellite Observation */}
      {isCorroborateModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Satellite className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Physical Earth Observation Corroboration</h3>
              </div>
              <button onClick={() => setIsCorroborateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TARGET CONCESSION / INCIDENT:</span>
                <span className="font-bold text-white">{selectedIncident.title}</span>
                <span className="text-[11px] text-cyan-400 block mt-0.5">BBox: [{selectedIncident.bbox.join(', ')}]</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sensor Pipeline:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BOTH', label: 'Dual Fused', desc: 'SAR + Optical' },
                    { id: 'SAR', label: 'Sentinel-1 SAR', desc: 'Radar Backscatter' },
                    { id: 'OPTICAL', label: 'Sentinel-2 MSI', desc: 'NDVI Canopy Loss' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setCorroborateSensor(s.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        corroborateSensor === s.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs">{s.label}</div>
                      <div className="text-[10px] opacity-75">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                  <span>COMPARISON WINDOW:</span>
                  <span className="text-cyan-400">{corroborateDays} Days</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="120"
                  step="7"
                  value={corroborateDays}
                  onChange={(e) => setCorroborateDays(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCorroborateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCorroborate}
                disabled={actionLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Satellite className="w-3.5 h-3.5" />}
                <span>Execute Corroboration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Discovered Satellite Passes */}
      {isPassesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Copernicus OData Discovered Passes</h3>
              </div>
              <button onClick={() => setIsPassesModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {passesProvenance && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-slate-500 block text-[9px]">CATALOGUE SOURCE:</span>
                  <span className="text-emerald-400 font-bold">{passesProvenance.dataSource}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">TOTAL SCENES:</span>
                  <span className="text-white font-bold">{passesProvenance.totalScenesDiscovered}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">SAR PASSES:</span>
                  <span className="text-cyan-400 font-bold">{passesProvenance.sarPassCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">OPTICAL PASSES:</span>
                  <span className="text-amber-400 font-bold">{passesProvenance.opticalPassCount}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {discoveredScenes.map((s, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white font-mono text-[11px]">{s.id}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Platform: {s.platform}</span>
                      <span>•</span>
                      <span>Sensor: {s.sensorType}</span>
                      {s.cloudCover !== undefined && <span>• Cloud: {s.cloudCover}%</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(s.acquisitionDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Tamper-Evident Audit Ledger */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Conflict Intelligence Tamper-Evident Audit Ledger</h3>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-bold">{log.action}</span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">{log.details}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                    <span>Actor: {log.actorEmail}</span>
                    <span>SHA-256: {log.sha256Signature?.slice(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ConflictIntelligenceView;
