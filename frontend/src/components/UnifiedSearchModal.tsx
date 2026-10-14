import React, { useState, useEffect } from 'react';
import { SearchItem } from '../types';
import { searchApi } from '../services/api';
import { Search, X, Building2, User, Globe, ArrowRight } from 'lucide-react';
import { NavTab } from './Sidebar';

interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab?: (tab: NavTab) => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  isOpen,
  onClose,
  setActiveTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = async (qText: string, tFilter: string) => {
    try {
      setLoading(true);
      const typeParam = tFilter === 'profiles' ? 'users' : tFilter;
      const res = await searchApi.search(qText, typeParam, 20);
      setResults(res.items || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchResults(query, selectedType);
    }, 120);

    return () => clearTimeout(timer);
  }, [query, selectedType, isOpen]);

  if (!isOpen) return null;

  const handleResultClick = (item: SearchItem) => {
    if (setActiveTab) {
      if (item.type === 'satellite_target') {
        setActiveTab('change-intelligence');
      } else if (item.type === 'businesses') {
        setActiveTab('business-intelligence');
      } else if (item.type === 'users') {
        setActiveTab('settings');
      }
    }
    onClose();
  };

  const typeIcons: Record<string, React.ReactNode> = {
    satellite_target: <Globe size={16} style={{ color: '#34d399' }} />,
    businesses: <Building2 size={16} style={{ color: 'var(--accent)' }} />,
    users: <User size={16} style={{ color: 'var(--gold)' }} />,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'start center',
        background: 'rgba(4, 9, 18, 0.75)',
        backdropFilter: 'blur(12px)',
        padding: '4rem 1rem 1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={20} style={{ color: 'var(--accent)' }} />
          <input
            type="text"
            autoFocus
            placeholder="Search satellite AOIs, African enterprises, or profiles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '1.05rem',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="btn btn-ghost"
              style={{ padding: '0.35rem', color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'satellite', label: 'Satellite' },
            { id: 'businesses', label: 'Businesses' },
            { id: 'profiles', label: 'Profiles' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={'btn ' + (selectedType === t.id ? 'btn-primary' : 'btn-ghost')}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                textTransform: 'capitalize',
                background: selectedType === t.id ? '#0ea5e9' : 'transparent',
                color: selectedType === t.id ? '#ffffff' : '#94a3b8',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Searching AFRIQORA directory...
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No matching records found for this filter.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {results.map((item) => (
                <div
                  key={item.type + '-' + item.id}
                  onClick={() => handleResultClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    transition: 'var(--transition)',
                    cursor: 'pointer',
                  }}
                  className="glass-panel-hover"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                    e.currentTarget.style.borderColor = '#38bdf8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {typeIcons[item.type] || <Search size={16} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{item.title}</strong>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.65rem',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#38bdf8',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                        {item.description || item.location || item.subtitle || 'AFRIQORA Verified Target'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', flexShrink: 0, marginLeft: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Open</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UnifiedSearchModal;
