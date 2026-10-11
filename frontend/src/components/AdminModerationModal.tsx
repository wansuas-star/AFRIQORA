import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { X, ShieldAlert, Check, XCircle, Building2, Megaphone } from 'lucide-react';

interface AdminModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const AdminModerationModal: React.FC<AdminModerationModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'verifications'>('campaigns');
  const [pendingCampaigns, setPendingCampaigns] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingModeration();
      setPendingCampaigns(res.pendingCampaigns || []);
      setPendingVerifications(res.pendingVerifications || []);
    } catch (err) {
      console.error('Failed to load pending moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPending();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModerateCampaign = async (id: string, action: 'approve' | 'reject') => {
    try {
      await adminApi.moderateCampaign(id, action, action === 'reject' ? rejectReason : undefined);
      setRejectingId(null);
      setRejectReason('');
      await fetchPending();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to moderate campaign');
    }
  };

  const handleModerateVerification = async (id: string, action: 'approve' | 'reject') => {
    try {
      await adminApi.moderateVerification(id, action, action === 'reject' ? rejectReason : undefined);
      setRejectingId(null);
      setRejectReason('');
      await fetchPending();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to moderate verification');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(4, 9, 18, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: '1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={22} style={{ color: 'var(--gold)' }} />
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Admin Commercial Moderation Queue</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`btn ${activeTab === 'campaigns' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <Megaphone size={15} />
            Pending Ad Campaigns ({pendingCampaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            className={`btn ${activeTab === 'verifications' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <Building2 size={15} />
            Business Verifications ({pendingVerifications.length})
          </button>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '0.85rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading queue...</div>
          ) : activeTab === 'campaigns' ? (
            pendingCampaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No pending ad campaigns to review.
              </div>
            ) : (
              pendingCampaigns.map((c) => (
                <div key={c.id} className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{c.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Merchant: {c.business?.businessName} ({c.business?.owner?.displayName})
                      </span>
                    </div>
                    <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--gold)', fontSize: '0.7rem' }}>
                      Budget: ${c.totalBudget}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--accent)' }}>"{c.headline}"</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>{c.description}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>CTA: {c.ctaText} → {c.ctaUrl}</span>
                  </div>

                  {rejectingId === c.id ? (
                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Reason for rejection (guidelines violation)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.8rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setRejectingId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>Cancel</button>
                        <button onClick={() => handleModerateCampaign(c.id, 'reject')} className="btn btn-danger" style={{ fontSize: '0.75rem' }}>Confirm Rejection</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setRejectingId(c.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <XCircle size={13} /> Reject
                      </button>
                      <button onClick={() => handleModerateCampaign(c.id, 'approve')} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Check size={13} /> Approve & Activate
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            pendingVerifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No pending business verifications.
              </div>
            ) : (
              pendingVerifications.map((v) => (
                <div key={v.id} className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{v.business?.businessName}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Category: {v.business?.category} | Owner: {v.business?.owner?.displayName}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                    <div><strong>Reg #:</strong> {v.registrationNumber || 'N/A'}</div>
                    {v.taxId && <div><strong>Tax ID / TIN:</strong> {v.taxId}</div>}
                    {v.documentUrl && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <strong>Proof URL:</strong> <a href={v.documentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{v.documentUrl}</a>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleModerateVerification(v.id, 'reject')} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                      <XCircle size={13} /> Reject
                    </button>
                    <button onClick={() => handleModerateVerification(v.id, 'approve')} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                      <Check size={13} /> Verify Business
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
