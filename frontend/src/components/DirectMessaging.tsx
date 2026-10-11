import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { messagingApi, searchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare, Search } from 'lucide-react';

export const DirectMessaging: React.FC<{ openAuthModal: () => void }> = ({ openAuthModal }) => {
  const { user } = useAuth();
  const [peerId, setPeerId] = useState('');
  const [peerName, setPeerName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (peerId) {
      loadThread(peerId);
    }
  }, [peerId]);

  const loadThread = async (id: string) => {
    try {
      setLoading(true);
      const res = await messagingApi.getThread(id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await searchApi.search(searchQuery, 'people', 10);
      setSearchResults(res.items || []);
    } catch (err) {
      console.error('Peer search error:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !peerId) return;

    try {
      const res = await messagingApi.sendMessage(peerId, content.trim());
      if (res.message) {
        setMessages([...messages, res.message]);
        setContent('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px', margin: '3rem auto' }}>
        <h2>Direct Messaging</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Sign in to connect directly with African business owners, customers, and partners.
        </p>
        <button className="btn btn-primary" onClick={openAuthModal}>
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '960px',
      margin: '0 auto',
      padding: '1.5rem 0',
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 340px) 1fr',
      gap: '1.25rem',
      height: 'calc(100vh - 140px)',
    }}>
      {/* Left Peer Search & Contacts */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Messages</h3>
          <form onSubmit={handleSearchPeer} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Find member or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem', height: '38px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          </form>
        </div>

        {/* Contacts List / Search Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {searchResults.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0 0.5rem' }}>Search Results</span>
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setPeerId(p.id);
                    setPeerName(p.title);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: peerId === p.id ? 'var(--surface-hover)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  className="glass-panel-hover"
                >
                  <div style={{
                    width: '2.2rem',
                    height: '2.2rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                  }}>
                    {p.title.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', margin: 0 }}>{p.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.subtitle || p.afriqoraId}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {peerId ? `Chatting with ${peerName}` : 'Search for a member above to start a conversation.'}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Thread */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {peerId ? (
          <>
            {/* Thread Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.4rem',
                  height: '2.4rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                  color: '#04111d',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                }}>
                  {peerName.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', margin: 0 }}>{peerName || 'Direct Contact'}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>● Online</span>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading thread...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                  No messages yet. Send a greeting to start direct dialogue.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isMine
                          ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))'
                          : 'var(--surface-2)',
                        color: isMine ? '#04111d' : 'var(--text)',
                        fontWeight: isMine ? 500 : 400,
                        fontSize: '0.9rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div>{msg.content}</div>
                      <span style={{
                        display: 'block',
                        fontSize: '0.68rem',
                        textAlign: 'right',
                        marginTop: '0.25rem',
                        color: isMine ? 'rgba(4, 17, 29, 0.7)' : 'var(--text-dim)',
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={!content.trim()} className="btn btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
              <h3>Select a Conversation</h3>
              <p style={{ fontSize: '0.88rem' }}>Choose or search for a member on the left to start messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
