import React from 'react';
import {
  Compass,
  Orbit,
  Layers,
  Pickaxe,
  Building2,
  Sparkles,
  Search,
  Bell,
  Radio,
  Activity,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'overview'
  | 'satellite'
  | 'conflict'
  | 'change-intelligence'
  | 'earth-observation'
  | 'mining'
  | 'business-intelligence'
  | 'jobs'
  | 'search'
  | 'notifications'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  openSearchModal: () => void;
  openNotifications: () => void;
  unreadNotifications: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openSearchModal,
  openNotifications,
  unreadNotifications,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  void openSearchModal;

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    onClick?: () => void;
    accentColor?: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Compass size={18} />,
      accentColor: '#38bdf8',
    },
    {
      id: 'satellite',
      label: 'Satellite Intelligence',
      icon: <Orbit size={18} />,
      accentColor: '#10b981',
    },
    {
      id: 'conflict',
      label: 'Conflict Intelligence',
      icon: <Shield size={18} />,
      badge: 'DRC',
      accentColor: '#f43f5e',
    },
    {
      id: 'change-intelligence',
      label: 'Change Intelligence',
      icon: <Activity size={18} />,
      badge: 'ML-01',
      accentColor: '#f59e0b',
    },
    {
      id: 'earth-observation',
      label: 'Earth Observation',
      icon: <Layers size={18} />,
      accentColor: '#34d399',
    },
    {
      id: 'mining',
      label: 'Mining Intelligence',
      icon: <Pickaxe size={18} />,
      accentColor: '#fbbf24',
    },
    {
      id: 'business-intelligence',
      label: 'Business Intelligence',
      icon: <Building2 size={18} />,
      accentColor: '#60a5fa',
    },
    {
      id: 'jobs',
      label: 'Jobs and Opportunities',
      icon: <Sparkles size={18} />,
      badge: 'Active',
      accentColor: '#a78bfa',
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search size={18} />,
      accentColor: '#38bdf8',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={18} />,
      badge: unreadNotifications > 0 ? (unreadNotifications > 9 ? '9+' : unreadNotifications) : undefined,
      onClick: openNotifications,
    },
    
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.onClick) {
      item.onClick();
    } else {
      setActiveTab(item.id);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`af-app-sidebar ${isOpenMobile ? 'mobile-open' : ''}`}
      style={{
        width: '280px',
        background: 'rgba(9, 18, 34, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <img
          src="/assets/afriqora-logo.png"
          alt="AFRIQORA Logo"
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'contain',
            borderRadius: '10px',
            background: '#ffffff',
            padding: '2px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '0.08em',
                color: '#f8fafc',
              }}
            >
              AFRIQORA
            </span>
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.1rem',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            Satellite Intelligence
          </div>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#64748b',
            padding: '0 0.65rem 0.5rem',
          }}
        >
          Platform Modules
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: isActive
                    ? `1px solid ${item.accentColor || 'rgba(56, 189, 248, 0.4)'}`
                    : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.05))'
                    : 'transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <span
                  style={{
                    color: isActive ? item.accentColor || '#38bdf8' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </span>

                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>

                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      background: typeof item.badge === 'number' || item.badge.includes('+')
                        ? '#0ea5e9'
                        : 'rgba(167, 139, 250, 0.2)',
                      color: typeof item.badge === 'number' || item.badge.includes('+')
                        ? '#04111d'
                        : '#c4b5fd',
                      border: typeof item.badge === 'number'
                        ? 'none'
                        : '1px solid rgba(167, 139, 250, 0.4)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Constellation Status Card */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.85rem',
            borderRadius: '12px',
            background: 'rgba(15, 26, 44, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
            <Radio size={14} color="#34d399" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>
              Copernicus Sentinel Feed
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.45 }}>
            Sentinel-1 C-SAR &amp; Sentinel-2 MSI active over African Mining Corridors.
          </div>
        </div>
      </div>

      {/* User Footer / Auth Status */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(7, 13, 24, 0.75)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: user ? 'linear-gradient(135deg, #10b981, #0ea5e9)' : 'rgba(255, 255, 255, 0.1)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          {user ? user.displayName.charAt(0).toUpperCase() : 'G'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user ? user.displayName : 'Guest Operator'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            {user ? (user.isPlatformOwner ? 'Platform Owner' : 'Verified Analyst') : 'Public Access'}
          </div>
        </div>
      </div>
    </aside>
  );
};
