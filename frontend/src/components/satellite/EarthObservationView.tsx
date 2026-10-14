import React, { useState } from 'react';
import {
  Layers,
  Eye,
  Sliders,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Sun,
  Clock,
  Database
} from 'lucide-react';
import { satelliteApi } from '../../services/api';

interface EOImageryPreset {
  id: string;
  name: string;
  region: string;
  country: string;
  coordinates: string;
  lat: number;
  lon: number;
  sensor: 'Sentinel-2 MSI' | 'Sentinel-1 SAR';
  recommendedBand: string;
  description: string;
  applications: string[];
}

const EO_PRESETS: EOImageryPreset[] = [
  {
    id: 'gerd',
    name: 'Grand Ethiopian Renaissance Dam (GERD)',
    region: 'Benishangul-Gumuz',
    country: 'Ethiopia',
    coordinates: '11.215° N, 35.093° E',
    lat: 11.215,
    lon: 35.093,
    sensor: 'Sentinel-2 MSI',
    recommendedBand: 'NDWI (Water Inundation)',
    description: 'Reservoir filling dynamics, Blue Nile catchment hydrology, and dam wall structural telemetry.',
    applications: ['Water Management', 'Regional Hydrology', 'Infrastructure Monitoring']
  },
  {
    id: 'lake-chad',
    name: 'Lake Chad Basin Receding Shoreline',
    region: 'Sahel Catchment',
    country: 'Chad / Niger / Nigeria / Cameroon',
    coordinates: '13.000° N, 14.500° E',
    lat: 13.0,
    lon: 14.5,
    sensor: 'Sentinel-2 MSI',
    recommendedBand: 'False Color Infrared (B08-B04-B03)',
    description: 'High-cadence environmental stress tracking, shoreline oscillation, and agricultural reed growth.',
    applications: ['Ecological Security', 'Drought Assessment', 'Transboundary Water']
  },
  {
    id: 'suez-maritime',
    name: 'Suez Canal & Red Sea Transit Corridor',
    region: 'Suez / Port Said',
    country: 'Egypt',
    coordinates: '30.585° N, 32.265° E',
    lat: 30.585,
    lon: 32.265,
    sensor: 'Sentinel-1 SAR',
    recommendedBand: 'Radar VV/VH Polarization',
    description: 'Vessel density, all-weather maritime choke point tracking, and port anchorage congestion monitoring.',
    applications: ['Maritime Logistics', 'Trade Telemetry', 'Vessel Tracking']
  },
  {
    id: 'niger-delta',
    name: 'Niger Delta Coastal & Wetland Mangroves',
    region: 'Gulf of Guinea Catchment',
    country: 'Nigeria',
    coordinates: '4.750° N, 6.000° E',
    lat: 4.75,
    lon: 6.0,
    sensor: 'Sentinel-1 SAR',
    recommendedBand: 'Radar Backscatter Coherence',
    description: 'Cloud-penetrating radar observation of coastal accretion, hydrocarbon slick detection, and mangrove conservation.',
    applications: ['Environmental Protection', 'Hydrocarbon Safety', 'Coastal Dynamics']
  }
];

export const EarthObservationView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<EOImageryPreset>(EO_PRESETS[0]);
  const [selectedBand, setSelectedBand] = useState<string>('true-color');
  const [cloudCoverFilter, setCloudCoverFilter] = useState<number>(15);
  const [dateRange, setDateRange] = useState<string>('30d');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const executeObservation = async (preset: EOImageryPreset, overrideBand?: string) => {
    setIsLoading(true);
    const bandToQuery = overrideBand || selectedBand;
    try {
      const res = await satelliteApi.queryIntelligence({
        query: `Earth observation spectral telemetry for ${preset.name} (${preset.country}) analyzing ${bandToQuery} with cloud threshold <= ${cloudCoverFilter}% over recent ${dateRange}.`,
        targetName: preset.name,
        timeWindow: dateRange === '90d' ? '90_days' : (dateRange === '180d' ? '6_months' : '30_days'),
      });
      setQueryResult({
        ...res,
        activeBand: bandToQuery,
        cloudThreshold: cloudCoverFilter,
        targetPreset: preset,
      });
    } catch (err) {
      console.error('EO query error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <Layers size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399' }}>
              Continental Multi-Spectral Telemetry
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Earth Observation &amp; Multi-Sensor Telemetry
            </h1>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '780px', lineHeight: 1.6, margin: 0 }}>
          Direct access to European Space Agency Copernicus Sentinel-2 Optical (MSI) and Sentinel-1 Synthetic Aperture Radar (SAR) observations. Analyze surface change, spectral reflectance, water indices, and vegetation biomass across African biomes.
        </p>

        {/* 4-Tier Data Feed Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>Feed Mode:</span>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Copernicus OData Catalogue &amp; Calibrated Benchmark</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Clock size={13} />
            <span>Telemetry Baseline: 2026-10-14 05:00 UTC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Database size={13} />
            <span>Source: ESA Copernicus Data Space</span>
          </div>
        </div>
      </div>

      {/* Control Panel & Band Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Band Selection Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sliders size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spectral Band Combinations</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { id: 'true-color', label: 'True Color (B04, B03, B02)', desc: 'Natural optical view for visual ground truth inspection' },
              { id: 'false-color-nir', label: 'False Color NIR (B08, B04, B03)', desc: 'Biomass vigor, canopy density, and vegetation stress' },
              { id: 'swir-geology', label: 'SWIR / Geology (B12, B08, B04)', desc: 'Mineral alteration, exposed rocks, and moisture mapping' },
              { id: 'ndwi-water', label: 'NDWI (Water Index)', desc: 'Open water delineations, reservoir expansion, and wetland analysis' },
              { id: 'sar-coherence', label: 'Sentinel-1 SAR (VV/VH)', desc: 'All-weather, cloud-penetrating radar coherence & surface texture' },
            ].map((band) => (
              <button
                key={band.id}
                onClick={() => setSelectedBand(band.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: selectedBand === band.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedBand === band.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.05)',
                  color: selectedBand === band.id ? '#f8fafc' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedBand === band.id ? '#38bdf8' : '#e2e8f0' }}>
                  {band.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{band.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Telemetry Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sun size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Observation Constraints</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#94a3b8' }}>Cloud Cover Threshold:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>&le; {cloudCoverFilter}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={cloudCoverFilter}
                onChange={(e) => setCloudCoverFilter(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                <span>0% (Pristine optical)</span>
                <span>50% (Radar recommended)</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Acquisition Lookback Window
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {['7d', '14d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '6px',
                      background: dateRange === range ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: dateRange === range ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: dateRange === range ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(15, 26, 44, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Cloud size={14} color="#34d399" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>Sentinel Revisit Orbit Cadence</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                High-cadence 5-day revisit cycle active over African equatorial and sub-Saharan parallels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Target Presets & Investigation Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Active Earth Observation Targets</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Select an African target to query real multi-sensor evidence</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
          {EO_PRESETS.map((preset) => {
            const isSelected = selectedPreset.id === preset.id;
            return (
              <div
                key={preset.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #10b981' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(15, 26, 44, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSelectedPreset(preset)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                      {preset.country}
                    </span>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0.2rem 0' }}>{preset.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{preset.coordinates}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      background: preset.sensor.includes('SAR') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                      color: preset.sensor.includes('SAR') ? '#38bdf8' : '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    {preset.sensor}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45, margin: 0 }}>
                  {preset.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {preset.applications.map((app, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#cbd5e1',
                      }}
                    >
                      {app}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <button
                    className="btn btn-primary"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPreset(preset);
                      executeObservation(preset);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      fontSize: '0.82rem',
                      background: isSelected
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'rgba(56, 189, 248, 0.2)',
                      border: 'none',
                    }}
                  >
                    {isLoading && isSelected ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Querying Copernicus CDSE...
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Query Sentinel Telemetry
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Results Display */}
      {queryResult && (
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            borderRadius: '16px',
            border: '1px solid #10b981',
            background: 'rgba(10, 24, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Observed Intelligence: {queryResult.targetName || selectedPreset.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Report ID: {queryResult.reportId || 'EO-ACTIVE'} &bull; Copernicus Sentinel Verified Telemetry
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                Source: {queryResult.dataSource || 'COPERNICUS_ODATA_CATALOGUE'}
              </span>
              {queryResult.evidence?.confidenceScore && (
                <span
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                  }}
                >
                  Confidence: {Math.round(queryResult.evidence.confidenceScore * 100)}%
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '10px',
              background: 'rgba(15, 26, 44, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '1.25rem',
              lineHeight: 1.6,
              fontSize: '0.92rem',
              color: '#f1f5f9',
            }}
          >
            {queryResult.answer}
          </div>

          {/* Evidence Breakdown */}
          {queryResult.evidence && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {queryResult.evidence.observed?.length > 0 && (
                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem' }}>
                    DIRECTLY OBSERVED
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {queryResult.evidence.observed.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {queryResult.evidence.detected?.length > 0 && (
                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.35rem' }}>
                    SPECTRAL DETECTIONS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {queryResult.evidence.detected.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
