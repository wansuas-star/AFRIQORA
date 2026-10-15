import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { Search, Bell, Globe, LogOut, Menu, X } from 'lucide-react';

interface HeaderProps {
  openAuthModal: () => void;
  openSearchModal: () => void;
  openNotifications: () => void;
  unreadNotifications: number;
  toggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  openAuthModal,
  openSearchModal,
  openNotifications,
  unreadNotifications,
  toggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  void openAuthModal;

  return (
    <header
      className="site-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 35,
        backdropFilter: 'blur(16px)',
        background: 'rgba(7, 13, 24, 0.88)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 0',
        }}
      >
        {/* Left Section: Mobile Menu Trigger + Brand (hidden on desktop if sidebar is visible) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {toggleMobileSidebar && (
            <button
              className="btn btn-ghost mobile-menu-btn"
              onClick={toggleMobileSidebar}
              aria-label="Toggle navigation"
              style={{ padding: '0.45rem', display: 'flex', alignItems: 'center' }}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img
              src="/assets/afriqora-logo.png"
              alt="AFRIQORA"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                borderRadius: '8px',
                background: '#ffffff',
                padding: '2px',
              }}
            />
            <span
              style={{
                fontWeight: 800,
                letterSpacing: '0.12em',
                fontSize: '1.05rem',
                color: '#f8fafc',
              }}
            >
              AFRIQORA
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Search */}
          <button
            className="btn btn-ghost"
            onClick={openSearchModal}
            aria-label="Search"
            style={{
              padding: '0.45rem 0.85rem',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
            }}
          >
            <Search size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Search...</span>
          </button>

          {/* Notifications Button */}
          {user && (
            <button
              className="btn btn-ghost"
              onClick={openNotifications}
              style={{ position: 'relative', padding: '0.55rem' }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    background: '#0ea5e9',
                    color: '#04111d',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    width: '17px',
                    height: '17px',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}

          {/* Language Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.3rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Globe size={14} style={{ color: '#94a3b8' }} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.78rem',
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

          {/* User Profile (if active session exists) */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                    border: '1px solid var(--border-accent)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                  }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="user-name-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {user.displayName}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={logout} title="Sign Out" style={{ padding: '0.45rem' }}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
