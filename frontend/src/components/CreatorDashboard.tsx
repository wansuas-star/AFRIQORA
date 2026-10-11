import React, { useState, useEffect } from 'react';
import { Wallet, BusinessProfile, Post } from '../types';
import { creatorApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DollarSign, Eye, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';

export const CreatorDashboard: React.FC<{ openAuthModal: () => void }> = ({ openAuthModal }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState<Wallet>({ earnings: 0, totalViews: 0 });
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [viewsThreshold, setViewsThreshold] = useState(100);

  const [loading, setLoading] = useState(true);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank_transfer');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<{ text: string; success: boolean } | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await creatorApi.getDashboard();
      setWallet(res.wallet || { earnings: 0, totalViews: 0 });
      setBusinessProfile(res.businessProfile);
      setPosts(res.posts || []);
      if (res.viewsThreshold) setViewsThreshold(res.viewsThreshold);
    } catch (err) {
      console.error('Failed to load creator dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading Creator & Business Hub...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px', margin: '3rem auto' }}>
        <h2>Creator & Business Hub</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Sign in to track your content earnings, manage payouts, and scale your business storefront.
        </p>
        <button className="btn btn-primary" onClick={openAuthModal}>
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    setWithdrawing(true);
    setWithdrawMessage(null);

    try {
      const res = await creatorApi.requestWithdrawal(amount, withdrawMethod);
      setWithdrawMessage({ text: res.message || 'Withdrawal submitted successfully!', success: true });
      setWithdrawAmount('');
      loadDashboard();
    } catch (err: any) {
      setWithdrawMessage({ text: err.message || 'Withdrawal failed', success: false });
    } finally {
      setWithdrawing(false);
    }
  };

  const isEligible = (wallet.totalViews || 0) >= viewsThreshold;
  const progressPct = Math.min(100, ((wallet.totalViews || 0) / viewsThreshold) * 100);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 0', display: 'grid', gap: '2rem' }}>
      {/* Header Overview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>Creator & Business Analytics</span>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{user.displayName}’s Hub</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AFRIQORA ID: {user.afriqoraId}</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Earnings Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('creator.earnings')}</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56,189,248,0.15)', color: 'var(--accent)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }} className="gradient-text">
            ${(wallet.earnings || 0).toFixed(4)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>70% Creator Revenue Share • $0.01 Gross/View</span>
        </div>

        {/* Views Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('creator.views')}</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(251,191,36,0.15)', color: 'var(--gold)' }}>
              <Eye size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {wallet.totalViews || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Unique views verified across rolling 24h windows</span>
        </div>

        {/* Payout Threshold Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payout Eligibility</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: isEligible ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)', color: isEligible ? 'var(--green)' : 'var(--text-dim)' }}>
              {isEligible ? <CheckCircle size={18} /> : <Clock size={18} />}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{wallet.totalViews || 0}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ {viewsThreshold} views</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', marginTop: '0.75rem', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--green))', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* Payout Form & Business Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Request Payout Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('creator.withdraw')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {isEligible
              ? 'You have reached the verified view threshold and can withdraw your earnings.'
              : `You need ${viewsThreshold - (wallet.totalViews || 0)} more views to unlock payouts.`}
          </p>

          {withdrawMessage && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              background: withdrawMessage.success ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
              color: withdrawMessage.success ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${withdrawMessage.success ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {withdrawMessage.text}
            </div>
          )}

          <form onSubmit={handleWithdraw} style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={wallet.availableBalance ?? wallet.earnings}
                disabled={!isEligible}
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Payout Method</label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                disabled={!isEligible}
                className="form-select"
              >
                <option value="bank_transfer" style={{ background: '#0a0f1c' }}>Local Bank Transfer (Direct)</option>
                <option value="mobile_money" style={{ background: '#0a0f1c' }}>M-Pesa / Mobile Money</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!isEligible || withdrawing || !withdrawAmount}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', padding: '0.7rem' }}
            >
              {withdrawing ? 'Submitting...' : 'Submit Withdrawal Request'}
              <ArrowUpRight size={16} />
            </button>
          </form>
        </div>

        {/* Business Profile Summary */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Business Storefront</h3>
              <span className="badge badge-cyan">{businessProfile ? 'Active' : 'Not Configured'}</span>
            </div>

            {businessProfile ? (
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.88rem' }}>
                <div><strong>Name:</strong> {businessProfile.businessName}</div>
                <div><strong>Category:</strong> {businessProfile.category}</div>
                {businessProfile.location && <div><strong>Location:</strong> {businessProfile.location}</div>}
                {businessProfile.phone && <div><strong>Contact:</strong> {businessProfile.phone}</div>}
                {businessProfile.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                    {businessProfile.description}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                You have not registered a commercial storefront yet. Create one to appear in the African business directory.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Creator's Published Posts */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Published Posts ({posts.length})</h3>
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No posts published yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{post.title || post.text?.slice(0, 50) || 'Post'}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(post.createdAt).toLocaleDateString()} • {post.category || 'General'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>{post._count?.likes || 0} Likes</span>
                  <span>{post._count?.comments || 0} Comments</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
