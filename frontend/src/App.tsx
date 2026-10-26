import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { notificationsApi } from './services/api';
import { setupStatusBar, registerHardwareBackButton, initPushNotifications } from './services/device';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/AuthModal';
import { BusinessVerificationModal } from './components/BusinessVerificationModal';
import { UnifiedSearchModal } from './components/UnifiedSearchModal';
import { SearchView } from './components/SearchView';
import { NotificationsDrawer } from './components/NotificationsDrawer';

// Feature Views
import { OverviewView } from './components/OverviewView';
import { SatelliteIntelligenceHub } from './components/SatelliteIntelligenceHub';
import { EarthObservationView } from './components/satellite/EarthObservationView';
import { ChangeIntelligenceView } from './components/satellite/ChangeIntelligenceView';
import { MiningIntelligenceView } from './components/satellite/MiningIntelligenceView';
import { ConflictIntelligenceView } from './components/satellite/ConflictIntelligenceView';
import { BusinessDirectory } from './components/BusinessDirectory';
import { JobsOpportunitiesView } from './components/JobsOpportunitiesView';
import { AccountSettingsView } from './components/AccountSettingsView';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Setup mobile native capabilities & hardware back button
  useEffect(() => {
    setupStatusBar(true);
    initPushNotifications();

    const unregister = registerHardwareBackButton(() => {
      if (isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
        return true;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }
      if (isVerificationModalOpen) {
        setIsVerificationModalOpen(false);
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
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        return true;
      }
      return false;
    });

    return unregister;
  }, [
    isMobileSidebarOpen,
    isAuthModalOpen,
    isVerificationModalOpen,
    isSearchModalOpen,
    isNotificationsOpen,
    activeTab,
  ]);

  // Check unread notifications periodically if authenticated
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
    <div className="afriqora-app-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop / Persistent Sidebar */}
      <div className="desktop-sidebar-container">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          openSearchModal={() => setIsSearchModalOpen(true)}
          openNotifications={() => setIsNotificationsOpen(true)}
          unreadNotifications={unreadNotifications}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '280px', height: '100%', animation: 'slideInLeft 0.25s ease' }}
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              openSearchModal={() => {
                setIsMobileSidebarOpen(false);
                setIsSearchModalOpen(true);
              }}
              openNotifications={() => {
                setIsMobileSidebarOpen(false);
                setIsNotificationsOpen(true);
              }}
              unreadNotifications={unreadNotifications}
              isOpenMobile={true}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="afriqora-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <Header
          openAuthModal={() => setIsAuthModalOpen(true)}
          openSearchModal={() => setIsSearchModalOpen(true)}
          openNotifications={() => setIsNotificationsOpen(true)}
          unreadNotifications={unreadNotifications}
          toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Content Body */}
        <main className="main-content-area" style={{ flex: 1, padding: '1.5rem 0 3rem' }}>
          <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.25rem' }}>
            {activeTab === 'overview' && (
              <OverviewView
                setActiveTab={setActiveTab}
                openAuthModal={() => setIsAuthModalOpen(true)}
                openSearchModal={() => setIsSearchModalOpen(true)}
              />
            )}

            {activeTab === 'satellite' && <SatelliteIntelligenceHub />}

            {activeTab === 'conflict' && <ConflictIntelligenceView />}

            {activeTab === 'change-intelligence' && <ChangeIntelligenceView />}

            {activeTab === 'earth-observation' && <EarthObservationView />}

            {activeTab === 'mining' && <MiningIntelligenceView />}

            {activeTab === 'business-intelligence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <BusinessDirectory openAuthModal={() => setIsAuthModalOpen(true)} />
              </div>
            )}

            {activeTab === 'jobs' && <JobsOpportunitiesView />}

            {activeTab === 'search' && <SearchView setActiveTab={setActiveTab} />}

            {activeTab === 'settings' && (
              <AccountSettingsView
                openAuthModal={() => setIsAuthModalOpen(true)}
                openVerificationModal={() => setIsVerificationModalOpen(true)}
              />
            )}
          </div>
        </main>

        {/* Desktop Footer */}
        <footer
          className="desktop-footer"
          style={{
            borderTop: '1px solid var(--border)',
            padding: '2rem 0',
            background: 'rgba(7, 13, 24, 0.85)',
          }}
        >
          <div
            className="container"
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src="/assets/afriqora-logo.png"
                alt="AFRIQORA Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              <span>
                &copy; {new Date().getFullYear()} AFRIQORA &bull; African Space Technology, Satellite Intelligence &amp; Geospatial Information Platform.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <button onClick={() => setActiveTab('overview')} className="btn btn-ghost" style={{ padding: 0 }}>
                Overview
              </button>
              <button onClick={() => setActiveTab('satellite')} className="btn btn-ghost" style={{ padding: 0 }}>
                Satellite Intel
              </button>
              <button onClick={() => setActiveTab('earth-observation')} className="btn btn-ghost" style={{ padding: 0 }}>
                Earth Observation
              </button>
              <button onClick={() => setActiveTab('mining')} className="btn btn-ghost" style={{ padding: 0 }}>
                Mining Radar
              </button>
              <button onClick={() => setActiveTab('business-intelligence')} className="btn btn-ghost" style={{ padding: 0 }}>
                Business Intelligence
              </button>
              <button onClick={() => setActiveTab('jobs')} className="btn btn-ghost" style={{ padding: 0 }}>
                Opportunities
              </button>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openAuthModal={() => setIsAuthModalOpen(true)}
          isLoggedIn={!!user}
        />

        {/* Global Modals & Drawers */}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <BusinessVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onSuccess={() => setIsVerificationModalOpen(false)}
        />
        <UnifiedSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
        <NotificationsDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onUpdateUnread={setUnreadNotifications}
        />
      </div>
    </div>
  );
};
