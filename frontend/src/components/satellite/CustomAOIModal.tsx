import React, { useState } from 'react';
import { X, Globe } from 'lucide-react';

interface CustomAOIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: {
    name: string;
    description: string;
    targetType: string;
    bbox: [number, number, number, number];
    centerLat: number;
    centerLon: number;
  }) => Promise<void>;
}

export const CustomAOIModal: React.FC<CustomAOIModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState('MINING');
  const [minLon, setMinLon] = useState('26.15');
  const [minLat, setMinLat] = useState('-10.65');
  const [maxLon, setMaxLon] = useState('26.25');
  const [maxLat, setMaxLat] = useState('-10.55');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a target name');
      return;
    }

    const nMinLon = parseFloat(minLon);
    const nMinLat = parseFloat(minLat);
    const nMaxLon = parseFloat(maxLon);
    const nMaxLat = parseFloat(maxLat);

    if (isNaN(nMinLon) || isNaN(nMinLat) || isNaN(nMaxLon) || isNaN(nMaxLat)) {
      setError('Coordinates must be valid numbers');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        name,
        description,
        targetType,
        bbox: [nMinLon, nMinLat, nMaxLon, nMaxLat],
        centerLat: (nMinLat + nMaxLat) / 2,
        centerLon: (nMinLon + nMaxLon) / 2,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save AOI');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(0, 229, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            }}>
              <Globe size={18} color="#00e5ff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Define Area of Interest (AOI)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Create a persistent satellite monitoring perimeter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#f87171',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Target Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Tenke Fungurume Western Pit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Target Sector / Type
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="MINING">Mining & Extraction Concession</option>
              <option value="PORT">Port, Maritime & Coastal Facility</option>
              <option value="INFRASTRUCTURE">Industrial & Civil Infrastructure</option>
              <option value="FORESTRY">Forestry & Vegetation Conservation</option>
              <option value="WATER">Water Body & Hydrology Basin</option>
              <option value="AGRICULTURE">Agricultural & Crop Yield Land</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="Optional operational details or asset tag"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Bounding Box Coordinates (GeoJSON Standard)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Min Longitude</span>
                <input
                  type="text"
                  value={minLon}
                  onChange={(e) => setMinLon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Min Latitude</span>
                <input
                  type="text"
                  value={minLat}
                  onChange={(e) => setMinLat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Max Longitude</span>
                <input
                  type="text"
                  value={maxLon}
                  onChange={(e) => setMaxLon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Max Latitude</span>
                <input
                  type="text"
                  value={maxLat}
                  onChange={(e) => setMaxLat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)',
                color: '#000000',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saving ? 'Saving Target...' : 'Save Monitoring AOI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
