import React from 'react';
import { Compass, Orbit, Layers, Pickaxe, Search } from 'lucide-react';
import { triggerHaptic } from '../services/device';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  openAuthModal: () => void;
  isLoggedIn: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
  isLoggedIn,
}) => {
  const handleTabClick = (tabId: NavTab, requiresAuth: boolean = false) => {
    triggerHaptic();
    if (requiresAuth && !isLoggedIn) {
      openAuthModal();
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(7, 13, 24, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        paddingTop: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* 1. Overview */}
      <button
        onClick={() => handleTabClick('overview')}
        className={'mobile-nav-item ' + (activeTab === 'overview' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeTab === 'overview' ? '#38bdf8' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 6px',
          flex: 1,
        }}
      >
        <Compass size={18} strokeWidth={activeTab === 'overview' ? 2.4 : 1.8} />
        <span style={{ fontSize: '0.62rem', fontWeight: activeTab === 'overview' ? 700 : 500 }}>
          Overview
        </span>
      </button>

      {/* 2. Satellite Intelligence */}
      <button
        onClick={() => handleTabClick('satellite')}
        className={'mobile-nav-item ' + (activeTab === 'satellite' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeTab === 'satellite' ? '#34d399' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 6px',
          flex: 1,
        }}
      >
        <Orbit size={18} strokeWidth={activeTab === 'satellite' ? 2.4 : 1.8} />
        <span style={{ fontSize: '0.62rem', fontWeight: activeTab === 'satellite' ? 700 : 500 }}>
          Satellite
        </span>
      </button>

      {/* 3. Earth Observation */}
      <button
        onClick={() => handleTabClick('earth-observation')}
        className={'mobile-nav-item ' + (activeTab === 'earth-observation' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeTab === 'earth-observation' ? '#38bdf8' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 6px',
          flex: 1,
        }}
      >
        <Layers size={18} strokeWidth={activeTab === 'earth-observation' ? 2.4 : 1.8} />
        <span style={{ fontSize: '0.62rem', fontWeight: activeTab === 'earth-observation' ? 700 : 500 }}>
          Earth Obs
        </span>
      </button>

      {/* 4. Mining Intelligence */}
      <button
        onClick={() => handleTabClick('mining')}
        className={'mobile-nav-item ' + (activeTab === 'mining' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeTab === 'mining' ? '#fbbf24' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 6px',
          flex: 1,
        }}
      >
        <Pickaxe size={18} strokeWidth={activeTab === 'mining' ? 2.4 : 1.8} />
        <span style={{ fontSize: '0.62rem', fontWeight: activeTab === 'mining' ? 700 : 500 }}>
          Mining
        </span>
      </button>

      {/* 5. Search */}
      <button
        onClick={() => handleTabClick('search')}
        className={'mobile-nav-item ' + (activeTab === 'search' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeTab === 'search' ? '#38bdf8' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 6px',
          flex: 1,
        }}
      >
        <Search size={18} strokeWidth={activeTab === 'search' ? 2.4 : 1.8} />
        <span style={{ fontSize: '0.62rem', fontWeight: activeTab === 'search' ? 700 : 500 }}>
          Search
        </span>
      </button>
    </nav>
  );
};
