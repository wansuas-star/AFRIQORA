import React from 'react';
import { Eye, Layers, Activity, Radio, Sun } from 'lucide-react';

export type SpectralLayerMode = 'optical_rgb' | 'optical_false_color' | 'optical_ndvi' | 'sar_backscatter' | 'sar_anomalies';

interface SpectralLayerControlsProps {
  currentMode: SpectralLayerMode;
  onModeChange: (mode: SpectralLayerMode) => void;
  availableModes?: SpectralLayerMode[];
}

export const SpectralLayerControls: React.FC<SpectralLayerControlsProps> = ({
  currentMode,
  onModeChange,
}) => {
  const modes: { id: SpectralLayerMode; label: string; sub: string; icon: any; color: string }[] = [
    {
      id: 'optical_rgb',
      label: 'True Color RGB',
      sub: 'B04, B03, B02 (10m)',
      icon: Sun,
      color: '#10b981',
    },
    {
      id: 'optical_false_color',
      label: 'False Color NIR',
      sub: 'B08, B04, B03 (Vegetation)',
      icon: Eye,
      color: '#ec4899',
    },
    {
      id: 'optical_ndvi',
      label: 'NDVI Anomaly',
      sub: 'Vegetation Differencing',
      icon: Activity,
      color: '#22c55e',
    },
    {
      id: 'sar_backscatter',
      label: 'SAR Radar Intensity',
      sub: 'Sentinel-1 C-Band (VV/VH)',
      icon: Radio,
      color: '#06b6d4',
    },
    {
      id: 'sar_anomalies',
      label: 'Radar Change Map',
      sub: 'Delta-gamma0 Differencing',
      icon: Layers,
      color: '#f59e0b',
    },
  ];

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      padding: '10px 14px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
        <Layers size={16} color="#00e5ff" />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Spectral Layer:
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: isActive ? `1px solid ${m.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive ? `${m.color}22` : 'rgba(30, 41, 59, 0.6)',
                color: isActive ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} color={isActive ? m.color : '#64748b'} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
