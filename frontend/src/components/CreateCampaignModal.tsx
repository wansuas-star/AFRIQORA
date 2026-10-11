import React, { useState } from 'react';
import { commercialApi } from '../services/api';
import { X, Sparkles, DollarSign, Check } from 'lucide-react';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [placement, setPlacement] = useState('all');
  const [targetCategory, setTargetCategory] = useState('Renewable Energy');
  const [targetLocation, setTargetLocation] = useState('All Regions');
  const [dailyBudget, setDailyBudget] = useState('10.00');
  const [totalBudget, setTotalBudget] = useState('50.00');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Visit Store');
  const [ctaUrl, setCtaUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedDaily = parseFloat(dailyBudget);
    const parsedTotal = parseFloat(totalBudget);

    if (!title.trim() || !headline.trim()) {
      setError('Please provide a campaign title and promotional headline.');
      return;
    }

    if (isNaN(parsedDaily) || parsedDaily <= 0) {
      setError('Daily budget must be greater than zero.');
      return;
    }

    if (isNaN(parsedTotal) || parsedTotal < parsedDaily) {
      setError('Total budget must be greater than or equal to daily budget.');
      return;
    }

    try {
      setSubmitting(true);
      await commercialApi.createCampaign({
        title: title.trim(),
        placement,
        targetCategory,
        targetLocation: targetLocation !== 'All Regions' ? targetLocation : undefined,
        dailyBudget: parsedDaily,
        totalBudget: parsedTotal,
        headline: headline.trim(),
        description: description.trim() || undefined,
        ctaText,
        ctaUrl: ctaUrl.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
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
      overflowY: 'auto',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '580px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Create Self-Serve Ad Campaign</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244,63,94,0.15)', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {/* Internal Title */}
          <div>
            <label className="form-label">Campaign Reference Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Solar Expansion Promotion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Placement, Category & Location Targeting */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Placement</label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="form-input"
              >
                <option value="all">All Channels</option>
                <option value="feed">Feed Only</option>
                <option value="search">Search Only</option>
                <option value="directory">Directory</option>
              </select>
            </div>

            <div>
              <label className="form-label">Category</label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="form-input"
              >
                <option value="Renewable Energy">Renewable Energy</option>
                <option value="Technology">Technology</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Consulting">Consulting</option>
                <option value="Trade">Retail Trade</option>
              </select>
            </div>

            <div>
              <label className="form-label">Region</label>
              <select
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="form-input"
              >
                <option value="All Regions">All Regions</option>
                <option value="West Africa">West Africa</option>
                <option value="East Africa">East Africa</option>
                <option value="Southern Africa">Southern Africa</option>
                <option value="North Africa">North Africa</option>
              </select>
            </div>
          </div>

          {/* Configurable Budgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(56,189,248,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}>
            <div>
              <label className="form-label" style={{ color: 'var(--accent)' }}>Daily Budget (USD)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '1.8rem' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ color: 'var(--accent)' }}>Total Budget Cap (USD)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="number"
                  step="5"
                  min="5"
                  required
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '1.8rem' }}
                />
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Campaign automatically pauses when total budget is reached. Cost: ~$0.05 per verified engagement click.
            </div>
          </div>

          {/* Creative Headline */}
          <div>
            <label className="form-label">Promotional Headline (Visible to users)</label>
            <input
              type="text"
              required
              placeholder="e.g. Reliable Solar Power for Factories & Farms"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Creative Description */}
          <div>
            <label className="form-label">Promotional Text / Offer</label>
            <textarea
              rows={3}
              placeholder="Describe your commercial offer, warranty, or value proposition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
            />
          </div>

          {/* Media URL */}
          <div>
            <label className="form-label">Creative Banner / Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Call to Action Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Button Action</label>
              <select
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="form-input"
              >
                <option value="Visit Store">Visit Store</option>
                <option value="Contact Merchant">Contact Merchant</option>
                <option value="View Services">View Services</option>
                <option value="Get Quote">Get Quote</option>
                <option value="Order Now">Order Now</option>
              </select>
            </div>

            <div>
              <label className="form-label">Destination URL</label>
              <input
                type="url"
                placeholder="https://yourstore.com or in-app link"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ gap: '0.4rem' }}>
              <Check size={16} />
              {submitting ? 'Submitting for Review...' : 'Submit Campaign for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
