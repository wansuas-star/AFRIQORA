import React from 'react';
import { Globe, Rocket, Briefcase, Building2, Shield } from 'lucide-react';
import { triggerHaptic } from '../services/device';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAuthModal: () => void;
  isLoggedIn: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
  isLoggedIn,
}) => {
  const handleTabClick = (tabId: string, requiresAuth: boolean = false) => {
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
        zIndex: 100,
        background: 'rgba(7, 13, 24, 0.94)',
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
      {/* 1. Satellite Intelligence */}
      <button
        onClick={() => handleTabClick('satellite')}
        className={'mobile-nav-item ' + (activeTab === 'satellite' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'satellite' ? '#34d399' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 8px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          position: 'relative',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'satellite' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Globe size={20} strokeWidth={activeTab === 'satellite' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: activeTab === 'satellite' ? 700 : 500 }}>
          Satellite
        </span>
      </button>

      {/* 2. Space Technologies */}
      <button
        onClick={() => handleTabClick('space-tech')}
        className={'mobile-nav-item ' + (activeTab === 'space-tech' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'space-tech' ? '#60a5fa' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 8px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'space-tech' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Rocket size={20} strokeWidth={activeTab === 'space-tech' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: activeTab === 'space-tech' ? 700 : 500 }}>
          Space Tech
        </span>
      </button>

      {/* 3. Directory & Opportunities */}
      <button
        onClick={() => handleTabClick('businesses')}
        className={'mobile-nav-item ' + (activeTab === 'businesses' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'businesses' ? 'var(--accent)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 8px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'businesses' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Briefcase size={20} strokeWidth={activeTab === 'businesses' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: activeTab === 'businesses' ? 700 : 500 }}>
          Directory
        </span>
      </button>

      {/* 4. Commercial Hub */}
      <button
        onClick={() => handleTabClick('commercial', true)}
        className={'mobile-nav-item ' + (activeTab === 'commercial' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'commercial' ? 'var(--gold)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 8px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'commercial' ? 'rgba(251, 191, 36, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Building2 size={20} strokeWidth={activeTab === 'commercial' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: activeTab === 'commercial' ? 700 : 500 }}>
          Commercial
        </span>
      </button>

      {/* 5. Investigative Workspace */}
      <button
        onClick={() => handleTabClick('investigations', false)}
        className={'mobile-nav-item ' + (activeTab === 'investigations' ? 'active' : '')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'investigations' ? '#38bdf8' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 8px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'investigations' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Shield size={20} strokeWidth={activeTab === 'investigations' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: activeTab === 'investigations' ? 700 : 500 }}>
          Investigate
        </span>
      </button>
    </nav>
  );
};
