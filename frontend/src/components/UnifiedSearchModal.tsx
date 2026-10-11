import React, { useState, useEffect } from 'react';
import { SearchItem } from '../types';
import { searchApi } from '../services/api';
import { Search, X, Building2, User, FileText, Video, ArrowRight } from 'lucide-react';

interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const res = await searchApi.search(query, selectedType, 20);
        setResults(res.items || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedType, isOpen]);

  if (!isOpen) return null;

  const typeIcons: Record<string, React.ReactNode> = {
    businesses: <Building2 size={16} style={{ color: 'var(--accent)' }} />,
    people: <User size={16} style={{ color: 'var(--gold)' }} />,
    posts: <FileText size={16} style={{ color: 'var(--green)' }} />,
    videos: <Video size={16} style={{ color: 'var(--accent-strong)' }} />,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'grid',
      placeItems: 'start center',
      background: 'rgba(4, 9, 18, 0.75)',
      backdropFilter: 'blur(12px)',
      padding: '4rem 1rem 1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '620px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={20} style={{ color: 'var(--accent)' }} />
          <input
            type="text"
            autoFocus
            placeholder="Search African businesses, people, trade posts, or topics..."
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
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid var(--border)',
        }}>
          {['all', 'businesses', 'people', 'posts', 'videos'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`btn ${selectedType === t ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                textTransform: 'capitalize',
              }}
            >
              {t}
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
              {query ? 'No matching results found.' : 'Type a query to search across the unified platform.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
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
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'grid',
                      placeItems: 'center',
                    }}>
                      {typeIcons[item.type] || <Search size={16} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                          {item.type}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                        {item.description || item.location || item.subtitle || 'AFRIQORA Verified'}
                      </p>
                    </div>
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--text-dim)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
