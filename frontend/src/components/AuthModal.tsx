import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) throw new Error('Display name is required');
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(4, 9, 18, 0.75)',
      backdropFilter: 'blur(10px)',
      padding: '1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2rem',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn btn-ghost"
          style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.4rem' }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/assets/afriqora-logo.png"
            alt="AFRIQORA"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              borderRadius: '12px',
              background: '#ffffff',
              padding: '4px',
              display: 'inline-block',
              marginBottom: '0.85rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {isRegister ? 'Join AFRIQORA' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {isRegister
              ? 'Create your free account to access African commerce & services'
              : 'Sign in to access your business dashboard and feed'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(10, 20, 36, 0.8)',
          borderRadius: 'var(--radius-md)',
          padding: '0.25rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border)',
        }}>
          <button
            type="button"
            className={`btn ${!isRegister ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => { setIsRegister(false); setError(null); }}
            style={{ fontSize: '0.88rem', padding: '0.45rem' }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`btn ${isRegister ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => { setIsRegister(true); setError(null); }}
            style={{ fontSize: '0.88rem', padding: '0.45rem' }}
          >
            Create Account
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Full Name / Business Owner Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amina Mwangi"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <UserIcon size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Please wait...' : isRegister ? 'Register Account' : 'Sign In'}
            <ArrowRight size={17} />
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '1.5rem' }}>
          Free user accounts • Encrypted credentials • Privacy-preserving
        </p>
      </div>
    </div>
  );
};
