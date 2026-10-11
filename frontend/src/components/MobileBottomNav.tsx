import React from 'react';
import { LayoutGrid, Briefcase, Plus, Building2, Shield } from 'lucide-react';
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
      {/* 1. Feed / Home */}
      <button
        onClick={() => handleTabClick('feed')}
        className={`mobile-nav-item ${activeTab === 'feed' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'feed' ? 'var(--accent)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 10px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          position: 'relative',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'feed' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <LayoutGrid size={22} strokeWidth={activeTab === 'feed' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'feed' ? 700 : 500 }}>
          Home
        </span>
      </button>

      {/* 2. Directory / Explore */}
      <button
        onClick={() => handleTabClick('businesses')}
        className={`mobile-nav-item ${activeTab === 'businesses' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'businesses' ? 'var(--accent)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 10px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'businesses' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Briefcase size={22} strokeWidth={activeTab === 'businesses' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'businesses' ? 700 : 500 }}>
          Directory
        </span>
      </button>

      {/* 3. Center Create Action Button (+) */}
      <button
        onClick={() => handleTabClick('creator', true)}
        aria-label="Create Post or Content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 8px',
          marginTop: '-14px',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)',
            color: '#04111d',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 18px rgba(56, 189, 248, 0.55)',
            transform: activeTab === 'creator' ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </div>
        <span style={{
          fontSize: '0.66rem',
          fontWeight: 700,
          color: activeTab === 'creator' ? 'var(--accent)' : 'var(--text-muted)',
          marginTop: '2px',
        }}>
          Create
        </span>
      </button>

      {/* 4. Commercial / Merchant Hub */}
      <button
        onClick={() => handleTabClick('commercial', true)}
        className={`mobile-nav-item ${activeTab === 'commercial' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'commercial' ? 'var(--gold)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 10px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'commercial' ? 'rgba(251, 191, 36, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Building2 size={22} strokeWidth={activeTab === 'commercial' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'commercial' ? 700 : 500 }}>
          Commercial
        </span>
      </button>

      {/* 5. Investigations */}
      <button
        onClick={() => handleTabClick('investigations', false)}
        className={`mobile-nav-item ${activeTab === 'investigations' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: activeTab === 'investigations' ? '#38bdf8' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px 10px',
          flex: 1,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'investigations' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          <Shield size={22} strokeWidth={activeTab === 'investigations' ? 2.4 : 1.8} />
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'investigations' ? 700 : 500 }}>
          Investigate
        </span>
      </button>
    </nav>
  );
};
