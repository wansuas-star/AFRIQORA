import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  ShieldCheck,
  Key,
  Building2,
  CheckCircle2,
  Copy,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccountSettingsViewProps {
  openAuthModal: () => void;
  openVerificationModal: () => void;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  openAuthModal,
  openVerificationModal,
}) => {
  const { user, logout } = useAuth();
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const sampleApiKey = 'afq_live_sentinel_' + (user ? user.id.slice(0, 8) : 'demo') + '_99x82fa';

  const copyApiKey = () => {
    navigator.clipboard.writeText(sampleApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Settings size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8' }}>
              Governance &amp; Operator Profile
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Account Settings &amp; Security Controls
            </h1>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '780px', lineHeight: 1.6, margin: 0 }}>
          Manage your enterprise profile, business verification credentials, satellite tasking API tokens, and Copernicus Data Space Ecosystem (CDSE) connections.
        </p>
      </div>

      {!user ? (
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <UserIcon size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Sign In to Manage Your Enterprise Account</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: 0 }}>
            Access verified satellite intelligence pipelines, manage corporate verification status, and configure confidential investigative workspaces.
          </p>
          <button
            className="btn btn-primary"
            onClick={openAuthModal}
            style={{ padding: '0.75rem 2rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            Authenticate / Register
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* User Profile Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{user.displayName}</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{user.email}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Access Tier:</span>
                <span style={{ fontWeight: 700, color: user.isPlatformOwner ? '#fbbf24' : '#34d399' }}>
                  {user.isPlatformOwner ? 'Platform Owner / Administrator' : 'Verified Enterprise Operator'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Account ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{user.id.slice(0, 16)}...</span>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={logout} style={{ width: '100%', gap: '0.5rem', color: '#f87171' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          {/* Business Verification Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Building2 size={22} color="#fbbf24" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>African Business Verification</h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.2rem' }}>
              Verified African enterprises receive verified gold badge status, prioritized search ranking, and authenticated satellite intelligence report credentials.
            </p>

            <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={20} color="#fbbf24" />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Submit official registration documents, tax identification, and corporate address to verify your organization.
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={openVerificationModal}
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                color: '#0f172a',
                fontWeight: 700,
              }}
            >
              Launch Business Verification
            </button>
          </div>

          {/* API Access & Copernicus Integration */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Key size={22} color="#38bdf8" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Satellite Telemetry API Token</h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem' }}>
              Use your programmatic API bearer token to query Copernicus CDSE radar data, download GeoTIFF assets, and integrate change alerts.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                readOnly
                value={sampleApiKey}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border)',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                }}
              />
              <button className="btn btn-secondary" onClick={copyApiKey} style={{ padding: '0.5rem 0.85rem' }}>
                {apiKeyCopied ? <CheckCircle2 size={16} color="#34d399" /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span>Copernicus CDSE API Connected &amp; Authenticated</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
