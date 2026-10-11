import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { Search, Bell, Globe, User as UserIcon, LogOut, Briefcase, Building2, Shield } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAuthModal: () => void;
  openSearchModal: () => void;
  openNotifications: () => void;
  unreadNotifications: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
  openSearchModal,
  openNotifications,
  unreadNotifications,
}) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="site-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(16px)',
      background: 'rgba(7, 13, 24, 0.85)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 0',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button
            onClick={() => setActiveTab('feed')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              padding: 0,
            }}
          >
            <img
              src="/assets/afriqora-logo.png"
              alt="AFRIQORA"
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'contain',
                borderRadius: '8px',
                background: '#ffffff',
                padding: '2px',
                display: 'block',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            />
            <span style={{
              fontWeight: 800,
              letterSpacing: '0.15em',
              fontSize: '1.15rem',
              color: 'var(--text)',
            }}>
              AFRIQORA
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className={`btn ${activeTab === 'satellite' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('satellite')}
              style={{ fontSize: '0.88rem', color: activeTab === 'satellite' ? '#34d399' : undefined }}
            >
              <Globe size={16} color="#10b981" />
              Satellite Intel
            </button>
            <button
              className={`btn ${activeTab === 'businesses' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('businesses')}
              style={{ fontSize: '0.88rem' }}
            >
              <Briefcase size={16} />
              Enterprise Directory
            </button>
            <button
              className={`btn ${activeTab === 'commercial' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => (user ? setActiveTab('commercial') : openAuthModal())}
              style={{ fontSize: '0.88rem' }}
            >
              <Building2 size={16} />
              Commercial Hub
            </button>
            <button
              className={`btn ${activeTab === 'investigations' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('investigations')}
              style={{ fontSize: '0.88rem', color: activeTab === 'investigations' ? '#38bdf8' : undefined }}
            >
              <Shield size={16} color="#38bdf8" />
              Investigative Workspace
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Search */}
          <button
            className="btn btn-ghost"
            onClick={openSearchModal}
            aria-label="Search"
            style={{ padding: '0.5rem 0.75rem', gap: '0.5rem' }}
          >
            <Search size={18} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Search...</span>
          </button>

          {/* Notifications Button */}
          {user && (
            <button
              className="btn btn-ghost"
              onClick={openNotifications}
              style={{ position: 'relative', padding: '0.6rem' }}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadNotifications > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'var(--accent)',
                  color: '#04111d',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  width: '18px',
                  height: '18px',
                  display: 'grid',
                  placeItems: 'center',
                }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
            <Globe size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="en" style={{ background: '#0a0f1c' }}>EN</option>
              <option value="fr" style={{ background: '#0a0f1c' }}>FR</option>
              <option value="sw" style={{ background: '#0a0f1c' }}>SW</option>
            </select>
          </div>

          {/* Auth State */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '2.2rem',
                  height: '2.2rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, #1e293b, #334155)',
                  border: '1px solid var(--border-accent)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user.displayName}</span>
              </div>
              <button className="btn btn-ghost" onClick={logout} title="Sign Out" style={{ padding: '0.5rem' }}>
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={openAuthModal} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <UserIcon size={16} />
              {t('nav.signin')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
