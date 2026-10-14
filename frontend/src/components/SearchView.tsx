import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Globe,
  Building2,
  User,
  ArrowRight,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { searchApi } from '../services/api';
import { SearchItem } from '../types';
import { NavTab } from './Sidebar';

interface SearchViewProps {
  setActiveTab: (tab: NavTab) => void;
  initialQuery?: string;
  initialType?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({
  setActiveTab,
  initialQuery = '',
  initialType = 'all',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTabStats, setActiveTabStats] = useState<{ total: number; satellite: number; businesses: number; profiles: number }>({
    total: 0,
    satellite: 0,
    businesses: 0,
    profiles: 0,
  });

  const executeSearch = async (searchTerm: string, typeFilter: string, categoryFilter: string) => {
    setLoading(true);
    try {
      const typeParam = typeFilter === 'profiles' ? 'users' : typeFilter;
      const res = await searchApi.search(searchTerm, typeParam, 30);
      let items = res.items || [];

      if (categoryFilter && categoryFilter !== 'all') {
        items = items.filter((item: any) =>
          (item.category && item.category.toLowerCase().includes(categoryFilter.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(categoryFilter.toLowerCase())) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(categoryFilter.toLowerCase()))
        );
      }

      setResults(items);

      // Compute counts
      const satCount = items.filter((i) => i.type === 'satellite_target').length;
      const busCount = items.filter((i) => i.type === 'businesses').length;
      const usrCount = items.filter((i) => i.type === 'users').length;

      setActiveTabStats({
        total: items.length,
        satellite: satCount,
        businesses: busCount,
        profiles: usrCount,
      });
    } catch (err) {
      console.error('Search query failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Run search when query, type, or category changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query, selectedType, selectedCategory);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, selectedType, selectedCategory]);

  const handleClear = () => {
    setQuery('');
  };

  const handleResultClick = (item: SearchItem) => {
    if (item.type === 'satellite_target') {
      // Direct to Change Intelligence or Satellite Hub
      setActiveTab('change-intelligence');
    } else if (item.type === 'businesses') {
      setActiveTab('business-intelligence');
    } else if (item.type === 'users') {
      setActiveTab('settings');
    }
  };

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    satellite_target: {
      label: 'Satellite AOI',
      icon: <Globe size={16} color="#34d399" />,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
    },
    businesses: {
      label: 'Verified Enterprise',
      icon: <Building2 size={16} color="#38bdf8" />,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
    },
    users: {
      label: 'Operator Profile',
      icon: <User size={16} color="#fbbf24" />,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.12)',
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9, #10b981)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
            }}
          >
            <Search size={22} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8' }}>
              Continental Intelligence Discovery
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              AFRIQORA Directory &amp; Target Search
            </h1>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '780px', lineHeight: 1.55, margin: 0 }}>
          Search across African satellite observation concessions, Earth observation hotspots, verified commercial enterprises, and space technology operators.
        </p>

        {/* Search Input Bar */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Search size={22} color="#38bdf8" />
          <input
            type="text"
            placeholder="Search satellite corridors, mining concessions, African enterprises, or profiles (e.g., GERD, Tenke, Solar)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '1.05rem',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={handleClear}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: '#cbd5e1',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Category Pills */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          padding: '1rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.75)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Module Type Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.35rem' }}>
            Domain:
          </span>
          {[
            { id: 'all', label: 'All Results', count: activeTabStats.total },
            { id: 'satellite', label: 'Satellite Targets & Hotspots', count: activeTabStats.satellite },
            { id: 'businesses', label: 'Verified Enterprises', count: activeTabStats.businesses },
            { id: 'profiles', label: 'Operator Profiles', count: activeTabStats.profiles },
          ].map((tab) => {
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isActive ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(16, 185, 129, 0.15))' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span>{tab.label}</span>
                {activeTabStats.total > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '999px',
                      background: isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#f8fafc' : '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.25rem' }}>
            Focus:
          </span>
          {[
            { id: 'all', label: 'All Focus Areas' },
            { id: 'mining', label: 'Mining & Excavation' },
            { id: 'hydrology', label: 'Hydrology & Dams' },
            { id: 'energy', label: 'Energy & Solar' },
            { id: 'urban', label: 'Urban Development' },
            { id: 'maritime', label: 'Maritime & Ports' },
          ].map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: isCatActive ? 700 : 500,
                  cursor: 'pointer',
                  background: isCatActive ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: isCatActive ? '#d8b4fe' : '#64748b',
                  border: isCatActive ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
          Found <strong style={{ color: '#38bdf8' }}>{results.length}</strong> matching intelligence records
          {query ? <span> for &ldquo;<span style={{ color: '#f8fafc' }}>{query}</span>&rdquo;</span> : <span> across directory</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Click any result to inspect telemetry or profile
        </div>
      </div>

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              borderRadius: '14px',
              color: '#94a3b8',
              fontSize: '0.92rem',
            }}
          >
            <div className="spin" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
              <Compass size={28} color="#38bdf8" />
            </div>
            <div>Querying AFRIQORA Satellite Directory &amp; Enterprise Database...</div>
          </div>
        ) : results.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <Search size={32} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#e2e8f0' }}>
              No matching records found
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
              Try broadening your search term, switching the domain tab, or selecting &ldquo;All Results&rdquo; to browse all verified targets.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setSelectedType('all');
                setSelectedCategory('all');
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters &amp; View All Records
            </button>
          </div>
        ) : (
          results.map((item) => {
            const config = typeConfig[item.type] || {
              label: item.type,
              icon: <Search size={16} />,
              color: '#38bdf8',
              bg: 'rgba(56, 189, 248, 0.12)',
            };

            return (
              <div
                key={item.type + '-' + item.id}
                onClick={() => handleResultClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.1rem 1.4rem',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = config.color;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: config.bg,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{item.title}</strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: config.bg,
                          color: config.color,
                          border: '1px solid ' + config.color + '40',
                        }}
                      >
                        {config.label}
                      </span>
                      {item.isVerified && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                      {item.description || item.subtitle || item.location || 'AFRIQORA Verified Directory Record'}
                    </p>

                    {item.metadata && (item.metadata as any).bbox && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        Bbox: {item.metadata.bbox}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: config.color, flexShrink: 0, marginLeft: '1rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Inspect</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SearchView;
