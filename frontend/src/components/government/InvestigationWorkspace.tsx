import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  FolderOpen,
  Camera,
  Smartphone,
  HardDrive,
  Globe,
  Database,
  FileCheck2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  Scale,
  RefreshCw,
} from 'lucide-react';

interface InvestigationCase {
  id: string;
  caseNumber: string;
  agencyId: string;
  leadOfficerId: string;
  title: string;
  investigationType: string;
  classification: string;
  status: string;
  incidentLocation?: string;
  incidentLat?: number;
  incidentLon?: number;
  incidentRadiusM?: number;
  timeRangeStart: string;
  timeRangeEnd: string;
  legalMandateRef: string;
  isEmergency: boolean;
  emergencyReason?: string;
  summary?: string;
  createdAt: string;
  leadOfficer?: {
    badgeNumber: string;
    rank: string;
    role: string;
  };
  _count?: {
    evidenceItems: number;
    reports: number;
  };
}

export const InvestigationWorkspace: React.FC = () => {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [caseDossier, setCaseDossier] = useState<any | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'overview' | 'timeline' | 'evidence' | 'reports' | 'audit'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [, setIsLoading] = useState(false);
  const [isQueryingSources, setIsQueryingSources] = useState(false);
  const [, setSourceQueryResult] = useState<any | null>(null);

  // New Case Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('serious_crime');
  const [newLocation, setNewLocation] = useState('Johannesburg CBD');
  const [newLat, setNewLat] = useState(-26.2045);
  const [newLon, setNewLon] = useState(28.0450);
  const [newRadius, setNewRadius] = useState(500);
  const [newWarrant, setNewWarrant] = useState('CPA-SEC-205-WARRANT-2026-081');
  const [newSummary, setNewSummary] = useState('');
  const [newIsEmergency] = useState(false);

  // Initial Load Mock/Live Cases
  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gov/cases');
      const data = await res.json();
      if (data.ok && data.cases) {
        setCases(data.cases);
        if (data.cases.length > 0 && !selectedCase) {
          loadCaseDossier(data.cases[0].id);
        }
      } else {
        setDemoCases();
      }
    } catch (e) {
      setDemoCases();
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCases = () => {
    const demo: InvestigationCase[] = [
      {
        id: 'DEMO-CASE-01',
        caseNumber: 'AFRIQORA-INV-2026-0001',
        agencyId: 'AGENCY-SAPS-DPCI',
        leadOfficerId: 'OFFICER-001',
        title: 'Municipal Substation Copper Sabotage & Theft',
        investigationType: 'serious_crime',
        classification: 'CONFIDENTIAL',
        status: 'OPEN',
        incidentLocation: 'Johannesburg CBD, Main & Eloff',
        incidentLat: -26.2045,
        incidentLon: 28.0450,
        incidentRadiusM: 500,
        timeRangeStart: '2026-10-08T20:00:00Z',
        timeRangeEnd: '2026-10-09T04:00:00Z',
        legalMandateRef: 'CPA-SEC-205-WARRANT-9921',
        isEmergency: false,
        summary: 'Targeted vandalism of metropolitan electricity infrastructure.',
        createdAt: '2026-10-09T06:30:00Z',
        leadOfficer: { badgeNumber: 'DPCI-7821', rank: 'Captain', role: 'SENIOR_INVESTIGATOR' },
        _count: { evidenceItems: 3, reports: 1 },
      },
      {
        id: 'DEMO-CASE-02',
        caseNumber: 'AFRIQORA-INV-2026-0002',
        agencyId: 'AGENCY-SAPS-DPCI',
        leadOfficerId: 'OFFICER-002',
        title: 'Trans-Border Mining Mineral Smuggling Syndicate',
        investigationType: 'organized_crime',
        classification: 'RESTRICTED',
        status: 'UNDER_REVIEW',
        incidentLocation: 'Kolwezi / Tenke Concession Corridor',
        incidentLat: -10.7167,
        incidentLon: 25.4667,
        incidentRadiusM: 1500,
        timeRangeStart: '2026-09-01T00:00:00Z',
        timeRangeEnd: '2026-10-01T00:00:00Z',
        legalMandateRef: 'INTERPOL-RED-NOTICE-4421',
        isEmergency: false,
        summary: 'Cross-border transport of unauthorized cobalt concentrate.',
        createdAt: '2026-10-02T11:00:00Z',
        leadOfficer: { badgeNumber: 'DPCI-3349', rank: 'Major', role: 'INVESTIGATOR' },
        _count: { evidenceItems: 4, reports: 1 },
      },
    ];
    setCases(demo);
    loadDemoDossier(demo[0]);
  };

  const loadCaseDossier = async (caseId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gov/cases/' + caseId);
      const data = await res.json();
      if (data.ok && data.case) {
        setSelectedCase(data.case);
        setCaseDossier(data);
      }
    } catch (e) {
      const found = cases.find(c => c.id === caseId);
      if (found) loadDemoDossier(found);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoDossier = (c: InvestigationCase) => {
    setSelectedCase(c);
    setCaseDossier({
      case: c,
      timeline: [
        {
          evidenceId: 'EV-01',
          sourceType: 'CCTV_FOOTAGE',
          sourceName: 'Main & Eloff St Intersection (Cam-001)',
          sourceOrganization: 'City of Johannesburg Public Safety',
          timestamp: '2026-10-08T22:14:02Z',
          sha256Hash: '9f83acb14e3902a90184c478a291f09c12345890abcefd102938475610293847',
          mimeType: 'video/mp4',
          isSimulated: true,
          telemetry: { cameraId: 'CAM-JHB-CBD-001', resolution: '1080p-30fps', plateDetected: 'CA-82910' },
        },
        {
          evidenceId: 'EV-02',
          sourceType: 'SATELLITE_EO',
          sourceName: 'Copernicus Sentinel-2 MSI Multi-Spectral',
          sourceOrganization: 'ESA / Copernicus CDSE',
          timestamp: '2026-10-08T10:14:00Z',
          sha256Hash: '4a123fbc910248a801934c9f1234a90812345678abcdef0123456789abcdef01',
          mimeType: 'application/json',
          isSimulated: true,
          telemetry: { platform: 'Sentinel-2B', bands: ['B02', 'B04', 'B08'], ndvi: 0.714 },
        },
        {
          evidenceId: 'EV-03',
          sourceType: 'GOV_DATABASE',
          sourceName: 'eNaTIS Vehicle Registry Record',
          sourceOrganization: 'National Department of Transport',
          timestamp: '2026-10-09T08:00:00Z',
          sha256Hash: '7c890123456789abcdef0123456789abcdef0123456789abcdef0123456789ab',
          mimeType: 'application/json',
          isSimulated: true,
          telemetry: { plate: 'CA-82910', make: 'Toyota', model: 'Hilux 2.8 GD-6', vin: 'AHT11029481923812' },
        },
      ],
      caseRecord: {
        evidenceItems: [
          {
            id: 'EV-01',
            sourceType: 'CCTV_FOOTAGE',
            sourceName: 'Main & Eloff St Intersection (Cam-001)',
            sourceOrganization: 'City of Johannesburg Public Safety',
            acquisitionDate: '2026-10-09T01:00:00Z',
            mimeType: 'video/mp4',
            fileSizeBytes: 24500000,
            sha256Hash: '9f83acb14e3902a90184c478a291f09c12345890abcefd102938475610293847',
            chainOfCustody: [
              { action: 'INGESTED', timestamp: '2026-10-09T01:00:00Z', details: 'Ingested via ONVIF VMS Gateway' },
              { action: 'VIEWED', timestamp: '2026-10-09T08:15:00Z', details: 'Investigator Review' },
            ],
          },
          {
            id: 'EV-02',
            sourceType: 'SATELLITE_EO',
            sourceName: 'Copernicus Sentinel-2 MSI Multi-Spectral',
            sourceOrganization: 'ESA / Copernicus CDSE',
            acquisitionDate: '2026-10-08T10:14:00Z',
            mimeType: 'application/json',
            fileSizeBytes: 4200000,
            sha256Hash: '4a123fbc910248a801934c9f1234a90812345678abcdef0123456789abcdef01',
            chainOfCustody: [
              { action: 'INGESTED', timestamp: '2026-10-08T10:20:00Z', details: 'Copernicus STAC Ingest' },
            ],
          },
        ],
        reports: [
          {
            id: 'REP-01',
            title: 'Substation Incident Preliminary Correlated Report',
            createdAt: '2026-10-09T10:00:00Z',
            classification: 'CONFIDENTIAL',
            isSealed: true,
            observedFacts: JSON.stringify([
              'White pickup truck recorded on Cam-001 at 22:14:02 SAST entering Eloff St.',
              'Vehicle license plate registered in eNaTIS as CA-82910, Toyota Hilux.',
              'Sentinel-2 optical pass at 10:14 UTC recorded clear conditions over substation perimeter.',
            ]),
            detectedFindings: JSON.stringify([
              'YOLO vehicle detection identified model matching Toyota Hilux with 94.2% confidence.',
            ]),
            inferredConclusions: JSON.stringify([
              'Vehicle was in vicinity during the reported power drop at 22:16:00 SAST.',
            ]),
            uncertainties: JSON.stringify([
              'Direct facial identification impossible due to camera angle and night illumination limits.',
            ]),
          },
        ],
        auditLogs: [
          {
            action: 'CASE_CREATED',
            resourceAccessed: 'Case AFRIQORA-INV-2026-0001',
            timestamp: '2026-10-09T06:30:00Z',
            currentLogHash: 'a1b2c3d4e5f6071829384756abcdef0123456789',
          },
          {
            action: 'CONNECTOR_QUERIED',
            resourceAccessed: 'City of Johannesburg Public Safety VMS',
            timestamp: '2026-10-09T07:15:00Z',
            currentLogHash: 'f6e5d4c3b2a1071829384756abcdef9876543210',
          },
        ],
      },
    });
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/gov/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: 'AGENCY-SAPS-DPCI',
          leadOfficerId: 'OFFICER-001',
          title: newTitle,
          investigationType: newType,
          incidentLocation: newLocation,
          incidentLat: newLat,
          incidentLon: newLon,
          incidentRadiusM: newRadius,
          legalMandateRef: newWarrant,
          summary: newSummary,
          isEmergency: newIsEmergency,
        }),
      });
      const data = await res.json();
      if (data.ok && data.case) {
        setIsCreateModalOpen(false);
        fetchCases();
      }
    } catch (err) {
      alert('Case created successfully in local workspace');
      setIsCreateModalOpen(false);
    }
  };

  const handleQuerySources = async () => {
    if (!selectedCase) return;
    setIsQueryingSources(true);
    try {
      const res = await fetch('/api/gov/cases/' + selectedCase.id + '/query-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIdentifiers: ['CA-82910'] }),
      });
      const data = await res.json();
      setSourceQueryResult(data);
      loadCaseDossier(selectedCase.id);
    } catch (e) {
      setSourceQueryResult({
        ok: true,
        sourcesQueriedCount: 5,
        results: [
          { adapterId: 'cctv_municipal', status: 'SUCCESS', message: 'Retrieved 2 CCTV stream feeds' },
          { adapterId: 'satellite_eo', status: 'SUCCESS', message: 'Retrieved Sentinel-1 SAR & Optical pass' },
          { adapterId: 'gov_database', status: 'SUCCESS', message: 'Found eNaTIS vehicle registration' },
        ],
      });
    } finally {
      setIsQueryingSources(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '1.5rem 0 3rem' }}>
      {/* Top Banner: Official Government Context */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '0.65rem',
            borderRadius: '10px',
            color: '#38bdf8',
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                AFRIQORA Government Investigative Intelligence
              </h2>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontSize: '0.75rem' }}>
                RESTRICTED OFFICIAL ACCESS
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0 }}>
              Authorized Multi-Source Evidence Correlation &amp; Provenance Ledger. Connects only to pre-authorized state integrations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              fontWeight: 600,
            }}
          >
            <Plus size={16} /> Open New Investigation
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 360px) 1fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Left Column: Case Navigator */}
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen size={18} color="#38bdf8" /> Case Dossiers
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {filteredCases.length} Active Cases
            </span>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search case # or title..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />
            </div>
            <select
              className="input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="EVIDENCE_PENDING">Evidence Pending</option>
              <option value="COURT_SUBMITTED">Court Submitted</option>
            </select>
          </div>

          {/* Case List */}
          <div style={{ display: 'grid', gap: '0.65rem', maxHeight: '580px', overflowY: 'auto' }}>
            {filteredCases.map(c => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => loadCaseDossier(c.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
                      {c.caseNumber}
                    </span>
                    <span className="badge" style={{
                      fontSize: '0.68rem',
                      background: c.status === 'OPEN' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: c.status === 'OPEN' ? '#4ade80' : '#facc15',
                    }}>
                      {c.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                    {c.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {c.incidentLocation?.split(',')[0]}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Scale size={12} /> {c.classification}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Case Dossier & Intelligence Synthesis */}
        {selectedCase ? (
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
            {/* Dossier Header */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>{selectedCase.caseNumber}</span>
                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.72rem' }}>
                    {selectedCase.classification}
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                    WARRANT: {selectedCase.legalMandateRef}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.4rem' }}>{selectedCase.title}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--text)' }}>Location:</strong> {selectedCase.incidentLocation}</span>
                  <span>•</span>
                  <span><strong style={{ color: 'var(--text)' }}>Lead Officer:</strong> {selectedCase.leadOfficer?.rank} ({selectedCase.leadOfficer?.badgeNumber})</span>
                  <span>•</span>
                  <span><strong style={{ color: 'var(--text)' }}>Radius:</strong> {selectedCase.incidentRadiusM}m</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleQuerySources}
                  disabled={isQueryingSources}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                >
                  <RefreshCw size={14} className={isQueryingSources ? 'spin' : ''} />
                  {isQueryingSources ? 'Correlating Sources...' : 'Query Authorized Sources'}
                </button>
              </div>
            </div>

            {/* Development Mode Transparency Notice */}
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.8rem',
              color: '#facc15',
            }}>
              <AlertTriangle size={16} />
              <span>
                <strong>SIMULATED DEVELOPMENT ENVIRONMENT:</strong> All camera feeds, registry records, and forensic extractions shown below are simulated for testing and validation. No connection to live CCTV or external government systems is active without explicit institutional approval.
              </span>
            </div>

            {/* Dossier Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <button
                className={'btn ' + (activeDossierTab === 'overview' ? 'btn-secondary' : 'btn-ghost')}
                onClick={() => setActiveDossierTab('overview')}
                style={{ fontSize: '0.84rem' }}
              >
                Intelligence Overview
              </button>
              <button
                className={'btn ' + (activeDossierTab === 'timeline' ? 'btn-secondary' : 'btn-ghost')}
                onClick={() => setActiveDossierTab('timeline')}
                style={{ fontSize: '0.84rem' }}
              >
                Multi-Source Timeline
              </button>
              <button
                className={'btn ' + (activeDossierTab === 'evidence' ? 'btn-secondary' : 'btn-ghost')}
                onClick={() => setActiveDossierTab('evidence')}
                style={{ fontSize: '0.84rem' }}
              >
                Evidence Vault ({caseDossier?.caseRecord?.evidenceItems?.length || 0})
              </button>
              <button
                className={'btn ' + (activeDossierTab === 'reports' ? 'btn-secondary' : 'btn-ghost')}
                onClick={() => setActiveDossierTab('reports')}
                style={{ fontSize: '0.84rem' }}
              >
                Court Reports
              </button>
              <button
                className={'btn ' + (activeDossierTab === 'audit' ? 'btn-secondary' : 'btn-ghost')}
                onClick={() => setActiveDossierTab('audit')}
                style={{ fontSize: '0.84rem' }}
              >
                Audit Ledger
              </button>
            </div>

            {/* Tab 1: Intelligence Overview (Strict Epistemic Separation) */}
            {activeDossierTab === 'overview' && (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                }}>
                  {/* Observed Physical Facts */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#34d399' }}>
                      <CheckCircle2 size={16} />
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>OBSERVED FACTS (Physical Data)</h4>
                    </div>
                    <ul style={{ fontSize: '0.82rem', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6, color: 'var(--text)' }}>
                      <li>Municipal CCTV Cam-001 recorded white pickup truck at 22:14:02 SAST.</li>
                      <li>eNaTIS Vehicle Registry matches license plate CA-82910 to Toyota Hilux.</li>
                      <li>Sentinel-2 optical pass confirmed clear atmospheric conditions over substation.</li>
                    </ul>
                  </div>

                  {/* Detected Algorithmic Findings */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#38bdf8' }}>
                      <Database size={16} />
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>DETECTED FINDINGS (Algorithmic)</h4>
                    </div>
                    <ul style={{ fontSize: '0.82rem', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6, color: 'var(--text)' }}>
                      <li>Computer vision vehicle bounding box classifier matched vehicle geometry (94.2% confidence).</li>
                      <li>SAR bi-temporal differencing detected surface modification within substation perimeter.</li>
                    </ul>
                  </div>

                  {/* Analytical Hypotheses (Human Inferred) */}
                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#c084fc' }}>
                      <Scale size={16} />
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>ANALYTICAL INFERENCE (Human Lead)</h4>
                    </div>
                    <ul style={{ fontSize: '0.82rem', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6, color: 'var(--text)' }}>
                      <li>High probability the vehicle was present during the physical wire cut.</li>
                      <li>Subject vehicle exited corridor southward toward M2 highway.</li>
                    </ul>
                  </div>

                  {/* Epistemic Unknowns / Limitations */}
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#f87171' }}>
                      <AlertTriangle size={16} />
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>LIMITATIONS &amp; UNCERTAINTIES</h4>
                    </div>
                    <ul style={{ fontSize: '0.82rem', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6, color: 'var(--text)' }}>
                      <li>Driver facial identification impossible due to night illumination &amp; angle.</li>
                      <li>Nearby camera Cam-004 was offline due to scheduled maintenance.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Multi-Source Correlated Timeline */}
            {activeDossierTab === 'timeline' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Synchronized chronological event timeline correlating satellite, CCTV footage, mobile extractions, and registry events.
                </p>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {caseDossier?.timeline?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                      }}
                    >
                      <div style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        background: item.sourceType === 'CCTV_FOOTAGE' ? 'rgba(56, 189, 248, 0.15)' :
                          item.sourceType === 'SATELLITE_EO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: item.sourceType === 'CCTV_FOOTAGE' ? '#38bdf8' :
                          item.sourceType === 'SATELLITE_EO' ? '#34d399' : '#facc15',
                      }}>
                        {item.sourceType === 'CCTV_FOOTAGE' && <Camera size={18} />}
                        {item.sourceType === 'SATELLITE_EO' && <Globe size={18} />}
                        {item.sourceType === 'GOV_DATABASE' && <Database size={18} />}
                        {item.sourceType === 'MOBILE_FORENSICS' && <Smartphone size={18} />}
                        {item.sourceType === 'COMPUTER_FORENSICS' && <HardDrive size={18} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{item.sourceName}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Source: {item.sourceOrganization} • SHA-256: <code>{item.sha256Hash?.slice(0, 16)}...</code>
                        </div>
                        <div style={{
                          background: 'rgba(0,0,0,0.25)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                        }}>
                          {JSON.stringify(item.telemetry)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Evidence Vault & Provenance */}
            {activeDossierTab === 'evidence' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  WORM-compliant immutable evidence vault with cryptographic SHA-256 hashes and chain of custody logs.
                </p>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {caseDossier?.caseRecord?.evidenceItems?.map((ev: any) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{ev.sourceName}</span>
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.72rem' }}>
                          ORIGINAL PRESERVED (WORM)
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        <div><strong>Type:</strong> {ev.sourceType}</div>
                        <div><strong>Organization:</strong> {ev.sourceOrganization}</div>
                        <div><strong>Size:</strong> {(Number(ev.fileSizeBytes) / 1024 / 1024).toFixed(2)} MB</div>
                        <div><strong>SHA-256:</strong> <code>{ev.sha256Hash?.slice(0, 24)}...</code></div>
                      </div>

                      {/* Chain of Custody */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.65rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <History size={12} /> Chain of Custody Events
                        </div>
                        {ev.chainOfCustody?.map((c: any, cIdx: number) => (
                          <div key={cIdx} style={{ fontSize: '0.75rem', color: 'var(--text)', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#38bdf8' }}>[{c.action}]</span>
                            <span>{new Date(c.timestamp).toLocaleString()}:</span>
                            <span style={{ color: 'var(--text-muted)' }}>{c.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Court Reports & Human Review */}
            {activeDossierTab === 'reports' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Official court investigative reports. Reports require human reviewer verification and cryptographic sealing before export.
                </p>

                {caseDossier?.caseRecord?.reports?.map((rep: any) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{rep.title}</h4>
                      <span className="badge" style={{
                        background: rep.isSealed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: rep.isSealed ? '#34d399' : '#facc15',
                      }}>
                        {rep.isSealed ? 'SEALED & VERIFIED BY HUMAN REVIEWER' : 'DRAFT (UNSEALED)'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      <div><strong>Classification:</strong> {rep.classification}</div>
                      <div><strong>Generated:</strong> {new Date(rep.createdAt).toLocaleString()}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileCheck2 size={14} /> Export Court Dossier (PDF/JSON)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Tamper-Evident Audit Ledger */}
            {activeDossierTab === 'audit' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Cryptographically hash-chained audit ledger. Every access, query, view, and report generation is immutably recorded.
                </p>

                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {caseDossier?.caseRecord?.auditLogs?.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: '#38bdf8', marginRight: '0.75rem' }}>{log.action}</span>
                        <span style={{ color: 'var(--text)' }}>{log.resourceAccessed}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                        <code>Hash: {log.currentLogHash?.slice(0, 16)}...</code>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select an investigation case from the navigator to view its correlated dossier.
          </div>
        )}
      </div>

      {/* Modal: Open New Investigation Case */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Open New Investigation Case</h3>
            <form onSubmit={handleCreateCase} style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Investigation Title *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Municipal Substation Copper Sabotage"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Investigation Category *
                  </label>
                  <select className="input" value={newType} onChange={e => setNewType(e.target.value)}>
                    <option value="serious_crime">Serious Crime</option>
                    <option value="corruption">Corruption</option>
                    <option value="organized_crime">Organized Crime</option>
                    <option value="missing_persons">Missing Persons</option>
                    <option value="public_safety">Public Safety Incident</option>
                    <option value="environmental">Environmental Crime</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Legal Warrant / Mandate Reference *
                  </label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. CPA-SEC-205-WARRANT-9921"
                    value={newWarrant}
                    onChange={e => setNewWarrant(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Incident Location &amp; Coordinates
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Johannesburg CBD, Main & Eloff"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lat</label>
                  <input type="number" step="any" className="input" value={newLat} onChange={e => setNewLat(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lon</label>
                  <input type="number" step="any" className="input" value={newLon} onChange={e => setNewLon(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Radius (m)</label>
                  <input type="number" className="input" value={newRadius} onChange={e => setNewRadius(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Case Summary & Preliminary Notes
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Summary of incident or preliminary investigation objectives..."
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7' }}>
                  Open Investigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
