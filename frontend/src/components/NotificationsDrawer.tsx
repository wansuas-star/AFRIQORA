import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { notificationsApi } from '../services/api';
import { X, Check, XCircle, Bell, UserPlus, Heart, MessageSquare } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnread: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose, onUpdateUnread }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications(50);
      setNotifications(res.items || []);
      onUpdateUnread(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onUpdateUnread(notifications.filter((n) => !n.read && n.id !== id).length);
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onUpdateUnread(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleConnectionRespond = async (note: Notification, accept: boolean) => {
    try {
      await notificationsApi.respondConnectionRequest(note.actorUserId, accept);
      await handleMarkRead(note.id);
      alert(accept ? 'Connection request accepted!' : 'Connection request declined.');
    } catch (err: any) {
      alert(err.message || 'Failed to respond to connection request');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(4, 9, 18, 0.65)',
      backdropFilter: 'blur(8px)',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        height: '100%',
        borderRadius: 0,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Notifications</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleMarkAllRead}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
            >
              Mark all read
            </button>
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Bell size={32} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
              <p>No notifications at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {notifications.map((note) => {
                const isConnReq = note.type === 'connection_request';

                return (
                  <div
                    key={note.id}
                    style={{
                      padding: '0.85rem 1rem',
                      background: note.read ? 'rgba(255,255,255,0.02)' : 'rgba(56,189,248,0.06)',
                      border: `1px solid ${note.read ? 'var(--border)' : 'var(--border-accent)'}`,
                      borderRadius: 'var(--radius-md)',
                      display: 'grid',
                      gap: '0.4rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => !note.read && handleMarkRead(note.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isConnReq ? (
                          <UserPlus size={15} style={{ color: 'var(--accent)' }} />
                        ) : note.type === 'like' ? (
                          <Heart size={15} style={{ color: 'var(--red)' }} />
                        ) : (
                          <MessageSquare size={15} style={{ color: 'var(--green)' }} />
                        )}
                        <strong style={{ fontSize: '0.88rem' }}>{note.title || 'Update'}</strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      {note.message}
                    </p>

                    {/* Action buttons for Connection Request */}
                    {isConnReq && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConnectionRespond(note, true); }}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        >
                          <Check size={13} />
                          Accept
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConnectionRespond(note, false); }}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        >
                          <XCircle size={13} />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
