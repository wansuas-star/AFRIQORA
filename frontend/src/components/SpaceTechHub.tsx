import React, { useState } from 'react';
import {
  Satellite,
  Radio,
  Globe2,
  Cpu,
  Layers,
  Award,
  ChevronRight,
  MapPin,
} from 'lucide-react';

interface SpaceAgency {
  code: string;
  name: string;
  country: string;
  headquarters: string;
  established: number;
  focus: string;
  assetsCount: number;
  groundStation: string;
  status: 'OPERATIONAL' | 'EXPANDING' | 'LAUNCH_PARTNER';
}

interface SatelliteAsset {
  name: string;
  agency: string;
  type: 'EARTH_OBSERVATION' | 'SAR_RADAR' | 'COMMUNICATIONS' | 'NANOSAT';
  launchYear: number;
  orbit: string;
  resolution: string;
  status: 'ACTIVE' | 'CALIBRATING' | 'PLANNED';
  application: string;
}

interface SpaceOpportunity {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: 'CAREER' | 'GRANT' | 'TENDER' | 'FELLOWSHIP';
  deadline: string;
  discipline: string;
}

export const SpaceTechHub: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'overview' | 'agencies' | 'constellations' | 'opportunities'>('overview');

  const spaceAgencies: SpaceAgency[] = [
    {
      code: 'AfSA',
      name: 'African Space Agency',
      country: 'African Union',
      headquarters: 'Space City, Cairo, Egypt',
      established: 2023,
      focus: 'Continental space policy, joint earth observation constellations, and data coordination',
      assetsCount: 14,
      groundStation: 'Continental Data Hub (Cairo & Hartebeesthoek)',
      status: 'OPERATIONAL',
    },
    {
      code: 'SANSA',
      name: 'South African National Space Agency',
      country: 'South Africa',
      headquarters: 'Pretoria & Hartebeesthoek',
      established: 2010,
      focus: 'Deep space tracking, Earth observation calibration, space weather monitoring',
      assetsCount: 8,
      groundStation: 'Hartebeesthoek Telemetry, Tracking & Command (TT&C)',
      status: 'OPERATIONAL',
    },
    {
      code: 'NASRDA',
      name: 'National Space Research and Development Agency',
      country: 'Nigeria',
      headquarters: 'Abuja',
      established: 1999,
      focus: 'Earth observation, disaster monitoring constellations, satellite communications',
      assetsCount: 6,
      groundStation: 'Center for Satellite Technology Development (Abuja)',
      status: 'OPERATIONAL',
    },
    {
      code: 'EGSA',
      name: 'Egyptian Space Agency',
      country: 'Egypt',
      headquarters: 'New Cairo Space City',
      established: 2018,
      focus: 'Assembly, Integration and Testing (AIT), multi-mission optical payloads',
      assetsCount: 7,
      groundStation: 'Satellite Assembly and Testing Center (Cairo)',
      status: 'OPERATIONAL',
    },
    {
      code: 'CRTS',
      name: 'Royal Center for Remote Sensing',
      country: 'Morocco',
      headquarters: 'Rabat',
      established: 1989,
      focus: 'Sub-meter optical earth observation, agriculture modeling, maritime surveillance',
      assetsCount: 4,
      groundStation: 'Rabat Remote Sensing Station',
      status: 'OPERATIONAL',
    },
    {
      code: 'KSA',
      name: 'Kenya Space Agency',
      country: 'Kenya',
      headquarters: 'Nairobi',
      established: 2017,
      focus: 'Equatorial tracking, regional crop monitoring, 3U/6U CubeSat constellations',
      assetsCount: 3,
      groundStation: 'Broglio Space Center (Malindi Offshore Facility)',
      status: 'EXPANDING',
    },
  ];

  const orbitalAssets: SatelliteAsset[] = [
    {
      name: 'NigeriaSat-2',
      agency: 'NASRDA',
      type: 'EARTH_OBSERVATION',
      launchYear: 2011,
      orbit: 'Sun-Synchronous (700 km)',
      resolution: '2.5m Panchromatic / 5m Multispectral',
      status: 'ACTIVE',
      application: 'Agricultural yield forecasting, urban planning, infrastructure monitoring',
    },
    {
      name: 'EgyptSat-A',
      agency: 'EGSA',
      type: 'EARTH_OBSERVATION',
      launchYear: 2019,
      orbit: 'Sun-Synchronous (650 km)',
      resolution: '1.0m Sub-meter Optical',
      status: 'ACTIVE',
      application: 'Nile basin hydrology, mineral exploration, desertification tracking',
    },
    {
      name: 'ZACube-2',
      agency: 'SANSA',
      type: 'NANOSAT',
      launchYear: 2018,
      orbit: 'Low Earth Orbit (500 km)',
      resolution: 'AIS Marine Transponder + SDR',
      status: 'ACTIVE',
      application: 'Operation Phakisa ocean tracking, illegal fishing prevention, maritime AIS',
    },
    {
      name: 'Mohammed VI-A & B',
      agency: 'CRTS',
      type: 'EARTH_OBSERVATION',
      launchYear: 2017,
      orbit: 'Sun-Synchronous (620 km)',
      resolution: '50cm Very High Resolution (VHR)',
      status: 'ACTIVE',
      application: 'Border governance, maritime traffic, land use, natural disaster response',
    },
    {
      name: 'Taifa-1',
      agency: 'KSA',
      type: 'EARTH_OBSERVATION',
      launchYear: 2023,
      orbit: 'Low Earth Orbit (510 km)',
      resolution: 'Hyperspectral Imaging (32m)',
      status: 'ACTIVE',
      application: 'Rift valley vegetation stress, drought monitoring, forest cover analysis',
    },
    {
      name: 'AFRIQORA EO-SAR Fleet (Planned)',
      agency: 'AfSA / AFRIQORA',
      type: 'SAR_RADAR',
      launchYear: 2027,
      orbit: 'Dawn-Dusk SSO (550 km)',
      resolution: '1.2m C-Band SAR / Multi-Polarized',
      status: 'PLANNED',
      application: 'Cloud-penetrating radar observation for African mining, ports, and borders',
    },
  ];

  const opportunities: SpaceOpportunity[] = [
    {
      id: 'OPP-001',
      title: 'Senior SAR Satellite Systems Engineer',
      organization: 'African Space Agency (AfSA)',
      location: 'Cairo, Egypt (Relocation Support)',
      type: 'CAREER',
      deadline: 'Nov 30, 2026',
      discipline: 'Radar Engineering / Payload Design',
    },
    {
      id: 'OPP-002',
      title: 'Geospatial ML Fellow — African Agronomic Mapping',
      organization: 'SANSA Earth Observation Directorate',
      location: 'Pretoria, South Africa',
      type: 'FELLOWSHIP',
      deadline: 'Dec 15, 2026',
      discipline: 'Machine Learning / Remote Sensing',
    },
    {
      id: 'OPP-003',
      title: 'Ground Station Telemetry Expansion Tender',
      organization: 'Kenya Space Agency (KSA)',
      location: 'Malindi Ground Station, Kenya',
      type: 'TENDER',
      deadline: 'Jan 10, 2027',
      discipline: 'Telecommunications / S-Band Antennas',
    },
    {
      id: 'OPP-004',
      title: 'CubeSat Constellation Data Pipeline Grant',
      organization: 'Pan-African Space Science Initiative',
      location: 'Remote / Continental Collaboration',
      type: 'GRANT',
      deadline: 'Dec 01, 2026',
      discipline: 'Orbital Dynamics & Cloud Compute',
    },
  ];

  return (
    <div className="space-tech-hub animate-fade-in" style={{ padding: '2rem 0 4rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.35) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1rem', fontSize: '0.82rem', fontWeight: 600 }}>
            <Radio size={14} />
            African Space Technologies &amp; Continental Orbital Infrastructure
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.15 }}>
            Sovereign Space Capabilities Across Africa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            Empowering continental self-determination through earth observation satellites, regional space agencies, ground telemetry networks, and professional aerospace opportunities.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCategory('agencies')}
              className={`btn ${activeCategory === 'agencies' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.88rem', padding: '0.65rem 1.25rem' }}
            >
              <Globe2 size={16} /> Continental Agencies
            </button>
            <button
              onClick={() => setActiveCategory('constellations')}
              className={`btn ${activeCategory === 'constellations' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.88rem', padding: '0.65rem 1.25rem' }}
            >
              <Satellite size={16} /> Orbital Assets
            </button>
            <button
              onClick={() => setActiveCategory('opportunities')}
              className={`btn ${activeCategory === 'opportunities' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.88rem', padding: '0.65rem 1.25rem' }}
            >
              <Award size={16} /> Jobs &amp; Opportunities
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ color: '#34d399', marginBottom: '0.5rem' }}><Satellite size={24} /></div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>45+ Satellites</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Launched by 15 African Nations</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ color: '#38bdf8', marginBottom: '0.5rem' }}><Radio size={24} /></div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>18 Ground Stations</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Operational TT&amp;C Facilities</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ color: '#fbbf24', marginBottom: '0.5rem' }}><Cpu size={24} /></div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>$20B Space Economy</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Projected Continental Market by 2028</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ color: '#a78bfa', marginBottom: '0.5rem' }}><Layers size={24} /></div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>AfSA Active</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>African Space Agency Coordination</div>
        </div>
      </div>

      {/* Section 1: Space Agencies */}
      {(activeCategory === 'overview' || activeCategory === 'agencies') && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.3rem' }}>African Continental Space Agencies</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Institutional authorities and national space programs driving African aerospace.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {spaceAgencies.map((agency) => (
              <div key={agency.code} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem', display: 'inline-block' }}>
                        {agency.code}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{agency.name}</h3>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{agency.country} • Est. {agency.established}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 600 }}>
                      {agency.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 1rem' }}>
                    {agency.focus}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  <div><strong>HQ:</strong> {agency.headquarters}</div>
                  <div><strong>Key Ground Station:</strong> {agency.groundStation}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Orbital Satellites */}
      {(activeCategory === 'overview' || activeCategory === 'constellations') && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.3rem' }}>African Satellite Constellations &amp; Sensors</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Active and planned orbital sensors serving African earth observation and sovereignty.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {orbitalAssets.map((sat) => (
              <div key={sat.name} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Satellite size={16} color="#10b981" />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{sat.name}</h3>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Operated by {sat.agency} • Launch: {sat.launchYear}</span>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{sat.type.replace('_', ' ')}</span>
                  </div>

                  <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.84rem', margin: '0 0 1rem' }}>
                    <div><span style={{ color: 'var(--text-dim)' }}>Orbit:</span> {sat.orbit}</div>
                    <div><span style={{ color: 'var(--text-dim)' }}>Resolution:</span> <strong>{sat.resolution}</strong></div>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {sat.application}
                  </p>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: sat.status === 'ACTIVE' ? '#34d399' : '#38bdf8', fontWeight: 600 }}>
                    ● {sat.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ML-01 Pipeline Verified</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Professional Opportunities & Tenders */}
      {(activeCategory === 'overview' || activeCategory === 'opportunities') && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.3rem' }}>Aerospace Careers, Grants &amp; Institutional Tenders</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Professional recruitment, research funding, and institutional procurement in African space technologies.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {opportunities.map((opp) => (
              <div key={opp.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{opp.type}</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{opp.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span><strong>{opp.organization}</strong></span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={13} /> {opp.location}</span>
                    <span>Discipline: {opp.discipline}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    <div>Deadline:</div>
                    <strong style={{ color: '#f59e0b' }}>{opp.deadline}</strong>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                    Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
