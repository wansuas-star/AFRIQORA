import React, { useState } from 'react';
import { commercialApi } from '../services/api';
import { X, ShieldCheck, Check } from 'lucide-react';

interface BusinessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BusinessVerificationModal: React.FC<BusinessVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [regNum, setRegNum] = useState('');
  const [taxId, setTaxId] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regNum.trim()) {
      setError('Business registration or incorporation number is required.');
      return;
    }

    try {
      setSubmitting(true);
      await commercialApi.submitVerification({
        registrationNumber: regNum.trim(),
        taxId: taxId.trim() || undefined,
        documentUrl: docUrl.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification request');
    } finally {
      setSubmitting(false);
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
        maxWidth: '500px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Apply for Verified Badge</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Verified African commercial storefronts receive the blue trust checkmark and enhanced ranking in the AFRIQORA business directory and search engine.
        </p>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244,63,94,0.15)', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label className="form-label">Business Registration / Certificate Number</label>
            <input
              type="text"
              required
              placeholder="e.g. RC-892182 or BN-2026-001"
              value={regNum}
              onChange={(e) => setRegNum(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Tax ID / TIN (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TIN-098231"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Document Proof / Certificate URL</label>
            <input
              type="url"
              placeholder="https://docs.yourcompany.com/cert.pdf"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="form-input"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              Link to your official certificate of incorporation or trade license.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ gap: '0.4rem' }}>
              <Check size={16} />
              {submitting ? 'Submitting...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
