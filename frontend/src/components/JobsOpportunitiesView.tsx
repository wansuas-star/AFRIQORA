import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Building2,
  Clock,
  CheckCircle2,
  Search
} from 'lucide-react';

interface JobOpportunity {
  id: string;
  title: string;
  organization: string;
  location: string;
  country: string;
  type: 'Full-Time' | 'Contract' | 'AU RFP / Tender' | 'Fellowship';
  category: 'Satellite Operations' | 'Remote Sensing' | 'Mining Intelligence' | 'GIS & Geospatial';
  salaryOrBudget: string;
  deadline: string;
  description: string;
  requirements: string[];
  isVerifiedOrg: boolean;
}

const JOBS_DATA: JobOpportunity[] = [
  {
    id: 'job-1',
    title: 'Lead Synthetic Aperture Radar (SAR) Analyst',
    organization: 'African Satellite Intelligence Center',
    location: 'Nairobi / Remote African Timezones',
    country: 'Kenya',
    type: 'Full-Time',
    category: 'Mining Intelligence',
    salaryOrBudget: '$54,000 - $72,000 USD / yr',
    deadline: 'Rolling Admission',
    description: 'Process Sentinel-1 C-SAR interferograms to monitor pit wall displacements and tailings storage dam integrity across Zambian and DRC copperbelt operations.',
    requirements: ['5+ years DInSAR / SNAP / Python remote sensing', 'Experience with Sentinel-1 & TerraSAR-X', 'Geological / mining engineering background'],
    isVerifiedOrg: true
  },
  {
    id: 'job-2',
    title: 'Satellite Ground Station Telemetry Engineer',
    organization: 'African Space Agency (AfSA)',
    location: 'Space City, Cairo',
    country: 'Egypt',
    type: 'Full-Time',
    category: 'Satellite Operations',
    salaryOrBudget: 'Competitive AU Grade P4',
    deadline: 'Nov 30, 2026',
    description: 'Oversee continental direct-broadcast X-band and S-band downlink antennas coordinating Copernicus collaborative ground segment data for member states.',
    requirements: ['Degree in Aerospace, RF or Telecommunications', 'Deep experience with tracking antenna pedestal controllers', 'Security clearance eligibility'],
    isVerifiedOrg: true
  },
  {
    id: 'job-3',
    title: 'Multi-Spectral Earth Observation Specialist',
    organization: 'Continental Geospatial Institute',
    location: 'Johannesburg / Pretoria',
    country: 'South Africa',
    type: 'Full-Time',
    category: 'Remote Sensing',
    salaryOrBudget: 'R 850,000 - R 1,100,000 ZAR',
    deadline: 'Dec 15, 2026',
    description: 'Develop automated NDVI, NDWI, and burn-severity pipelines across sub-Saharan agricultural belts for insurance and drought relief programs.',
    requirements: ['M.Sc in Geospatial Science or Remote Sensing', 'Sentinel-2 MSI spectral band analysis', 'Proficiency in Cloud-Optimized GeoTIFFs (COG) & STAC API'],
    isVerifiedOrg: true
  },
  {
    id: 'rfp-1',
    title: 'RFP: Lake Chad Transboundary Basin Hydrological Satellite Audit',
    organization: 'Lake Chad Basin Commission (LCBC)',
    location: 'N\'Djamena',
    country: 'Chad / Regional',
    type: 'AU RFP / Tender',
    category: 'Remote Sensing',
    salaryOrBudget: '$180,000 Project Allocation',
    deadline: 'Nov 15, 2026',
    description: 'Multi-temporal 5-year satellite assessment measuring shoreline oscillations, reed bed expansion, and irrigation off-takes.',
    requirements: ['Accredited African geospatial consultancy', 'Copernicus CDSE API integration capability', 'Verifiable past performance in water balance studies'],
    isVerifiedOrg: true
  },
  {
    id: 'job-4',
    title: 'Senior GIS & Concession Boundary Engineer',
    organization: 'Katanga Mineral Administration',
    location: 'Kolwezi / Lubumbashi',
    country: 'DR Congo',
    type: 'Contract',
    category: 'GIS & Geospatial',
    salaryOrBudget: '$60,000 - $80,000 USD',
    deadline: 'Open until filled',
    description: 'Reconcile cadastral mineral concession registries against current satellite earth observation baselines to eliminate overlapping claims.',
    requirements: ['ArcGIS Pro / QGIS mastery', 'PostGIS spatial database architecture', 'Bilingual French/English preferred'],
    isVerifiedOrg: true
  }
];

export const JobsOpportunitiesView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [activeJobModal, setActiveJobModal] = useState<JobOpportunity | null>(null);

  const filteredJobs = JOBS_DATA.filter((job) => {
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApply = (jobId: string) => {
    setAppliedJobs((prev) => ({ ...prev, [jobId]: true }));
    setTimeout(() => {
      setActiveJobModal(null);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c4b5fd' }}>
              Continental Talent &amp; Procurement Exchange
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Jobs &amp; Opportunities in African Space &amp; Geospatial
            </h1>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '780px', lineHeight: 1.6, margin: 0 }}>
          High-value careers, AU aerospace tenders, and research fellowships powering Africa&apos;s satellite intelligence economy. Connect directly with space agencies, mining operators, and geospatial institutions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Categories */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['All', 'Satellite Operations', 'Remote Sensing', 'Mining Intelligence', 'GIS & Geospatial'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                background: selectedCategory === cat ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedCategory === cat ? '1px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.08)',
                color: selectedCategory === cat ? '#f8fafc' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search roles, tenders, or countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              borderRadius: '8px',
              background: 'rgba(15, 26, 44, 0.7)',
              border: '1px solid var(--border)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: 'rgba(15, 26, 44, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: job.type === 'AU RFP / Tender' ? '#fbbf24' : '#a78bfa',
                  }}
                >
                  {job.type} &bull; {job.category}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0 0.15rem' }}>{job.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <Building2 size={14} color="#60a5fa" />
                  <span>{job.organization}</span>
                  {job.isVerifiedOrg && <span title="Verified Institutional Employer"><CheckCircle2 size={13} color="#10b981" /></span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={13} /> {job.location} ({job.country})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} /> {job.deadline}
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              {job.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {job.requirements.map((req, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#94a3b8',
                  }}
                >
                  {req}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                {job.salaryOrBudget}
              </span>
              <button
                className="btn btn-primary"
                onClick={() => setActiveJobModal(job)}
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  background: appliedJobs[job.id] ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  color: appliedJobs[job.id] ? '#34d399' : '#ffffff',
                  border: appliedJobs[job.id] ? '1px solid #10b981' : 'none',
                }}
              >
                {appliedJobs[job.id] ? (
                  <>
                    <CheckCircle2 size={13} /> Applied
                  </>
                ) : job.type === 'AU RFP / Tender' ? (
                  'Review Tender'
                ) : (
                  'Apply Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Application / Tender Modal */}
      {activeJobModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveJobModal(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid #a78bfa',
              background: '#091222',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                  {activeJobModal.type} Application
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0' }}>{activeJobModal.title}</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {activeJobModal.organization} &bull; {activeJobModal.location}
                </span>
              </div>
            </div>

            <div style={{ margin: '1rem 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {activeJobModal.description}
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
                APPLICATION REQUIREMENTS
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                {activeJobModal.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActiveJobModal(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleApply(activeJobModal.id)}
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              >
                {appliedJobs[activeJobModal.id] ? 'Application Submitted' : 'Submit Candidate Dossier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
