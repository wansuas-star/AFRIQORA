import React, { useState, useEffect } from 'react';
import { BusinessProfile, AdCampaign, MerchantTransaction, MerchantAnalytics } from '../types';
import { commercialApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreateCampaignModal } from './CreateCampaignModal';
import { BusinessVerificationModal } from './BusinessVerificationModal';
import { AdminModerationModal } from './AdminModerationModal';
import {
  Building2,
  ShieldCheck,
  Megaphone,
  TrendingUp,
  DollarSign,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Receipt,
  Sparkles,
} from 'lucide-react';

export const CommercialHub: React.FC<{ openAuthModal: () => void }> = ({ openAuthModal }) => {
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Deposit simulation state
  const [depositAmount, setDepositAmount] = useState('50.00');
  const [depositing, setDepositing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bizRes, campRes, anaRes, txRes] = await Promise.allSettled([
        commercialApi.getMerchantBusiness(),
        commercialApi.getCampaigns(),
        commercialApi.getMerchantAnalytics(),
        commercialApi.getBillingHistory(),
      ]);

      if (bizRes.status === 'fulfilled') setBusiness(bizRes.value.business);
      if (campRes.status === 'fulfilled') setCampaigns(campRes.value.campaigns || []);
      if (anaRes.status === 'fulfilled') setAnalytics(anaRes.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);
    } catch (err) {
      console.error('Failed to load commercial hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', maxWidth: '540px', margin: '3rem auto' }}>
        <Building2 size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
        <h2>AFRIQORA Commercial & Merchant Hub</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Register your African business, promote services in high-intent search feeds, and unlock verified commercial tools.
        </p>
        <button className="btn btn-primary" onClick={openAuthModal}>
          Sign In / Register Merchant
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
        Loading merchant commercial hub...
      </div>
    );
  }

  const handleToggleStatus = async (campaign: AdCampaign) => {
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await commercialApi.updateCampaignStatus(campaign.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update campaign status');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setDepositing(true);
      const reference = 'DEP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      await commercialApi.depositBudget({
        amount,
        paymentMethod: 'mpesa_mock',
        reference,
      });
      alert(`$${amount} deposit processed successfully!`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to deposit funds');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '2rem' }}>
      {/* Top Banner: Storefront Overview & Trust State */}
      <div className="glass-panel" style={{
        padding: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        background: 'linear-gradient(135deg, rgba(7, 13, 24, 0.9), rgba(15, 23, 42, 0.7))',
        border: '1px solid var(--border-accent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '3.8rem',
            height: '3.8rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent), #0284c7)',
            color: '#04111d',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.6rem',
            fontWeight: 800,
          }}>
            {business?.businessName?.charAt(0) || 'B'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{business?.businessName || 'Your African Business'}</h2>
              {business?.isVerified ? (
                <span className="badge badge-cyan" style={{ fontSize: '0.75rem', gap: '0.25rem' }}>
                  <CheckCircle2 size={13} /> Verified
                </span>
              ) : business?.verificationStatus === 'pending' ? (
                <span className="badge badge-gold" style={{ fontSize: '0.75rem', gap: '0.25rem' }}>
                  <Clock size={13} /> Verification Pending
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Unverified
                </span>
              )}
            </div>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {business?.category || 'General Commercial'} • {business?.location || 'Pan-African Reach'}
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!business?.isVerified && (
            <button onClick={() => setIsVerifyModalOpen(true)} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
              <ShieldCheck size={16} />
              {business?.verificationStatus === 'pending' ? 'Verification Submitted' : 'Get Verified Badge'}
            </button>
          )}

          <button onClick={() => setIsCampaignModalOpen(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            Create Ad Campaign
          </button>

          <button onClick={() => setIsAdminModalOpen(true)} className="btn btn-ghost" style={{ gap: '0.4rem', border: '1px solid var(--border)' }}>
            <ShieldAlert size={16} style={{ color: 'var(--gold)' }} />
            Admin Queue
          </button>
        </div>
      </div>

      {/* KPI Performance Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Active Campaigns</span>
            <Megaphone size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
            {analytics?.metrics?.activeCampaigns || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Ad Impressions</span>
            <TrendingUp size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
            {analytics?.metrics?.totalImpressions || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Delivered in feed & search</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Verified Clicks (CTR)</span>
            <Sparkles size={16} style={{ color: 'var(--accent-strong)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
            {analytics?.metrics?.totalClicks || 0} ({analytics?.metrics?.averageCtr || 0}%)
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Deduplicated & anti-fraud verified</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Total Ad Spend</span>
            <DollarSign size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>
            ${analytics?.metrics?.totalSpent?.toFixed(2) || '0.00'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Avg ~$0.05 per action</span>
        </div>
      </div>

      {/* Campaigns Table & Deposit Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Active Campaigns */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Advertising Campaigns</h3>
            <button onClick={() => setIsCampaignModalOpen(true)} className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
              + New Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No ad campaigns created yet. Start a campaign to promote your storefront.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {campaigns.map((c) => {
                const isExhausted = c.spentAmount >= c.totalBudget;
                const statusColor =
                  c.status === 'active'
                    ? 'var(--green)'
                    : c.status === 'pending_approval'
                    ? 'var(--gold)'
                    : 'var(--text-muted)';

                return (
                  <div key={c.id} style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{c.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Placement: {c.placement} • Target: {c.targetCategory || 'All'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{
                          background: `${statusColor}18`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                        }}>
                          {isExhausted ? 'Budget Exhausted' : c.status.replace('_', ' ')}
                        </span>

                        {(c.status === 'active' || c.status === 'paused') && !isExhausted && (
                          <button
                            onClick={() => handleToggleStatus(c)}
                            className="btn btn-ghost"
                            style={{ padding: '0.3rem', height: 'auto' }}
                            title={c.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                          >
                            {c.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--text-dim)',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span>Spend: ${c.spentAmount.toFixed(2)} / ${c.totalBudget.toFixed(2)}</span>
                      <span>{c.impressions} Impr. • {c.clicks} Clicks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Budget Deposit & Billing History */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Top-up Ad Budget</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Add advertising balance via simulated African mobile money (M-Pesa) or merchant card.
            </p>

            <form onSubmit={handleDeposit} style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Deposit Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '1.8rem' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={depositing} className="btn btn-primary" style={{ width: '100%' }}>
                {depositing ? 'Processing Deposit...' : 'Simulate Budget Deposit'}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Receipt size={16} style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Billing Invoices</h4>
            </div>

            {transactions.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No billing invoices yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span>${tx.amount.toFixed(2)} ({tx.paymentMethod})</span>
                    <span style={{ color: 'var(--green)' }}>✓ {tx.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={loadData}
      />
      <BusinessVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={loadData}
      />
      <AdminModerationModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onRefresh={loadData}
      />
    </div>
  );
};
