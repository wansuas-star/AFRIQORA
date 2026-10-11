import React, { useState } from 'react';
import { Post } from '../types';
import { commercialApi } from '../services/api';
import { Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const SponsoredPostCard: React.FC<{ post: Post }> = ({ post }) => {
  const [clicked, setClicked] = useState(false);

  const handleClickCta = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!post.campaignId) {
      if (post.ctaUrl) window.open(post.ctaUrl, '_blank');
      return;
    }

    try {
      setClicked(true);
      const nonce = 'clk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const res = await commercialApi.recordAdClick(post.campaignId, nonce);
      if (res.targetUrl) {
        window.open(res.targetUrl, '_blank');
      } else if (post.ctaUrl) {
        window.open(post.ctaUrl, '_blank');
      }
    } catch (err) {
      console.error('Click recording error:', err);
      if (post.ctaUrl) window.open(post.ctaUrl, '_blank');
    }
  };

  return (
    <article
      className="glass-panel animate-fade-in"
      style={{
        padding: '1.25rem 1.5rem',
        display: 'grid',
        gap: '0.85rem',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        background: 'linear-gradient(135deg, rgba(7, 13, 24, 0.8), rgba(15, 23, 42, 0.6))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Business identity + "Sponsored" Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent), #0284c7)',
              color: '#04111d',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            {post.business?.businessName?.charAt(0) || 'B'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                {post.business?.businessName || 'Verified African Enterprise'}
              </h4>
              {post.business?.isVerified && (
                <span title="Verified African Business" style={{ display: 'inline-flex' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {post.category || post.business?.category || 'Commercial Partner'}
            </span>
          </div>
        </div>

        {/* Clear, honest "Sponsored" Label */}
        <span
          className="badge"
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            color: 'var(--accent)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            fontSize: '0.68rem',
            padding: '0.2rem 0.55rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Sparkles size={11} /> Sponsored
        </span>
      </div>

      {/* Headline & Body Text */}
      <div>
        {post.title && (
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', fontWeight: 700, color: 'var(--text)' }}>
            {post.title}
          </h3>
        )}
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {post.text || post.content}
        </p>
      </div>

      {/* Media Creative (Image/Banner) */}
      {post.image && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            maxHeight: '340px',
            border: '1px solid var(--border)',
            background: '#040912',
          }}
        >
          <img
            src={post.image}
            alt={post.title || 'Sponsored advertisement'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Bottom CTA Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Promoted discovery for verified African commercial reach
        </span>

        <button
          onClick={handleClickCta}
          className="btn btn-primary"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            gap: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: clicked ? '0 0 12px var(--accent)' : 'none',
          }}
        >
          <span>{post.ctaText || 'Learn More'}</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
};
