import React, { useState, useEffect } from 'react';
import { BusinessProfile } from '../types';
import { searchApi, creatorApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Briefcase, MapPin, Phone, Globe, PlusCircle, CheckCircle2, Search, X, Building2 } from 'lucide-react';

const CATEGORIES = ['All', 'Technology', 'Renewable Energy', 'Agriculture', 'Consulting', 'Healthcare', 'Retail & Trade', 'Construction'];

export const BusinessDirectory: React.FC<{ openAuthModal: () => void }> = ({ openAuthModal }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Technology');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('KE');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBusinesses = async (q = '') => {
    try {
      setLoading(true);
      const res = await searchApi.search(q, 'businesses', 50);
      const bizList: BusinessProfile[] = (res.items || [])
        .filter((i) => i.type === 'businesses')
        .map((i) => ({
          id: i.id,
          ownerId: i.ownerId || '',
          businessName: i.title,
          category: i.category || 'General',
          description: i.description,
          location: i.location,
          phone: i.phone,
          website: i.website,
          logo: i.logo,
          owner: {
            id: i.ownerId || '',
            displayName: i.ownerDisplayName || 'Owner',
            afriqoraId: i.afriqoraId,
          },
        }));
      setBusinesses(bizList);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(query);
  }, [query]);

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      const res = await creatorApi.upsertBusinessProfile({
        businessName,
        category,
        location,
        country,
        phone,
        website,
        description,
      });

      if (res.businessProfile) {
        setIsRegisterOpen(false);
        fetchBusinesses();
        // Reset form
        setBusinessName('');
        setLocation('');
        setPhone('');
        setWebsite('');
        setDescription('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register business');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (selectedCategory !== 'All' && b.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem 0', display: 'grid', gap: '2rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '2.5rem',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(15,26,44,0.85) 100%)',
        border: '1px solid var(--border-accent)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
      }}>
        <div style={{ maxWidth: '600px' }}>
          <span className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>Verified African Commerce</span>
          <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>{t('biz.directoryTitle')}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Discover and connect with independent African businesses, suppliers, and service providers. No middlemen, total autonomy.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => (user ? setIsRegisterOpen(true) : openAuthModal())}
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
        >
          <PlusCircle size={18} />
          {t('nav.registerBiz')}
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={t('biz.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.75rem', height: '48px', fontSize: '1rem' }}
          />
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap', borderRadius: 'var(--radius-full)' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Business Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading businesses...
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <Building2 size={40} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
          <h3>No businesses found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Try adjusting your search query or be the first to list a business.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredBusinesses.map((biz) => (
            <article key={biz.id} className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #1e293b, #334155)',
                      border: '1px solid var(--border-accent)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      fontSize: '1.2rem',
                    }}>
                      {biz.businessName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{biz.businessName}</h3>
                        <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{biz.category}</span>
                    </div>
                  </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {biz.description || 'Verified business on AFRIQORA self-service commerce platform.'}
                </p>

                {/* Metadata */}
                <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
                  {biz.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: 'var(--accent)' }} />
                      <span>{biz.location}</span>
                    </div>
                  )}
                  {biz.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={14} style={{ color: 'var(--green)' }} />
                      <span>{biz.phone}</span>
                    </div>
                  )}
                  {biz.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Globe size={14} style={{ color: 'var(--accent)' }} />
                      <a href={biz.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                        {biz.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                <a
                  href={biz.phone ? `tel:${biz.phone}` : '#'}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem' }}
                >
                  <Phone size={14} />
                  Contact
                </a>
                <button
                  onClick={() => alert(`Connecting with ${biz.businessName}`)}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem' }}
                >
                  <Briefcase size={14} />
                  Enquire
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Register Business Modal */}
      {isRegisterOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(4, 9, 18, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{t('biz.registerHeading')}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('biz.registerSub')}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsRegisterOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterBusiness} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mara Solar & Engineering"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c} style={{ background: '#0a0f1c' }}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Nairobi"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Country Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KE, NG, ZA"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+254 700 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Website</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Description & Services</label>
                <textarea
                  placeholder="Describe your business offerings, experience, and service hours..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !businessName.trim()}
                className="btn btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem' }}
              >
                {submitting ? 'Registering...' : 'Save & Publish Storefront'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
