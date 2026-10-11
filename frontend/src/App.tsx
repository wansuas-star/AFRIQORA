import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { notificationsApi } from './services/api';
import { setupStatusBar, registerHardwareBackButton, initPushNotifications } from './services/device';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/AuthModal';
import { BusinessDirectory } from './components/BusinessDirectory';
import { CommercialHub } from './components/CommercialHub';
import { SatelliteIntelligenceHub } from './components/SatelliteIntelligenceHub';
import { SpaceTechHub } from './components/SpaceTechHub';
import { InvestigationWorkspace } from './components/government/InvestigationWorkspace';
import { UnifiedSearchModal } from './components/UnifiedSearchModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('satellite');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Setup mobile native capabilities & Android hardware back button
  useEffect(() => {
    setupStatusBar(true);
    initPushNotifications();

    const unregister = registerHardwareBackButton(() => {
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }
      if (isSearchModalOpen) {
        setIsSearchModalOpen(false);
        return true;
      }
      if (isNotificationsOpen) {
        setIsNotificationsOpen(false);
        return true;
      }
      if (activeTab !== 'satellite') {
        setActiveTab('satellite');
        return true;
      }
      return false; // Exit app if already at root satellite hub
    });

    return unregister;
  }, [isAuthModalOpen, isSearchModalOpen, isNotificationsOpen, activeTab]);

  // Periodically check for operational notifications if logged in
  useEffect(() => {
    if (!user) return;

    const checkUnread = async () => {
      try {
        const res = await notificationsApi.getNotifications(10);
        setUnreadNotifications(res.unreadCount || 0);
      } catch (e) {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={() => setIsAuthModalOpen(true)}
        openSearchModal={() => setIsSearchModalOpen(true)}
        openNotifications={() => setIsNotificationsOpen(true)}
        unreadNotifications={unreadNotifications}
      />

      {/* Main Content Area */}
      <main className="main-content-area" style={{ flex: 1 }}>
        <div className="container">
          {/* Hero Banner for unauthenticated guests visiting Satellite Hub */}
          {!user && activeTab === 'satellite' && (
            <section style={{
              padding: '2.5rem 0 2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1rem',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <img
                    src="/assets/afriqora-logo.png"
                    alt="AFRIQORA Logo"
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'contain',
                      borderRadius: '10px',
                      background: '#ffffff',
                      padding: '3px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    }}
                  />
                  <span className="badge badge-cyan" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <Sparkles size={13} /> Multi-Sensor Satellite Intelligence Platform
                  </span>
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem' }}>
                  Earth Observation &amp; AI Change Intelligence
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '540px' }}>
                  Analyze African mining, maritime ports, environmental reserves, and infrastructure via Sentinel-1 SAR &amp; Sentinel-2 Optical earth observations with verifiable multi-sensor evidence.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setActiveTab('satellite')} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    Launch Satellite Intel
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('space-tech')} style={{ padding: '0.75rem 1.5rem' }}>
                    Space Technologies
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('businesses')} style={{ padding: '0.75rem 1.5rem' }}>
                    Enterprise Directory
                  </button>
                </div>
              </div>

              {/* Value Props Card */}
              <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid var(--border-accent)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.2rem' }}>Platform Principles</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56,189,248,0.15)', color: 'var(--accent)', height: 'fit-content' }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.2rem' }}>Space &amp; Geospatial Intelligence</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Advanced African space technologies, orbital tracking, and high-cadence satellite analytics.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(52,211,153,0.15)', color: 'var(--green)', height: 'fit-content' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.2rem' }}>Zero Social Selling &amp; Pure Confidentiality</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No social feeds or ad profiling. Investigative workspaces enforce strict Owner-Only access governance.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Active 5 Pillar Views */}
          {activeTab === 'satellite' && <SatelliteIntelligenceHub />}
          {activeTab === 'space-tech' && <SpaceTechHub />}
          {activeTab === 'businesses' && <BusinessDirectory openAuthModal={() => setIsAuthModalOpen(true)} />}
          {activeTab === 'commercial' && <CommercialHub openAuthModal={() => setIsAuthModalOpen(true)} />}
          {activeTab === 'investigations' && <InvestigationWorkspace />}
        </div>
      </main>

      {/* Desktop Footer */}
      <footer className="desktop-footer" style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 0',
        marginTop: '3rem',
        background: 'rgba(7, 13, 24, 0.7)',
      }}>
        <div className="container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          <div>© {new Date().getFullYear()} AFRIQORA. Intelligence, Information &amp; African Space Technologies Platform.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button onClick={() => setActiveTab('satellite')} className="btn btn-ghost" style={{ padding: 0 }}>Satellite Intel</button>
            <button onClick={() => setActiveTab('space-tech')} className="btn btn-ghost" style={{ padding: 0 }}>Space Tech</button>
            <button onClick={() => setActiveTab('businesses')} className="btn btn-ghost" style={{ padding: 0 }}>Directory</button>
            <button onClick={() => setActiveTab('commercial')} className="btn btn-ghost" style={{ padding: 0 }}>Commercial Hub</button>
            <button onClick={() => setActiveTab('investigations')} className="btn btn-ghost" style={{ padding: 0 }}>Investigations</button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={() => setIsAuthModalOpen(true)}
        isLoggedIn={!!user}
      />

      {/* Global Modals & Drawers */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <UnifiedSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUpdateUnread={setUnreadNotifications}
      />
    </div>
  );
};
