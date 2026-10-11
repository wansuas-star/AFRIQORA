import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { feedApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SponsoredPostCard } from './SponsoredPostCard';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon, MapPin, Tag, Eye, Sparkles } from 'lucide-react';

export const FeedSection: React.FC<{ openAuthModal: () => void }> = ({ openAuthModal }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await feedApi.getHomeFeed();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      const res = await feedApi.createPost({
        title: title.trim() || undefined,
        text: text.trim(),
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        image: imageUrl.trim() || undefined,
      });

      if (res.post) {
        setPosts([res.post, ...posts]);
        setTitle('');
        setText('');
        setCategory('');
        setLocation('');
        setImageUrl('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = (postId: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'grid', gap: '1.5rem', padding: '1.5rem 0' }}>
      {/* Post Composer */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #1e293b, #334155)',
            border: '1px solid var(--border-accent)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {user ? user.displayName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Post Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{ marginBottom: '0.5rem', background: 'rgba(10,20,36,0.6)', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: '0', padding: '0.4rem 0' }}
            />
            <textarea
              placeholder={t('feed.composerPlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="form-textarea"
              style={{ minHeight: '80px', background: 'transparent', border: 'none', padding: '0.4rem 0' }}
            />
          </div>
        </div>

        {/* Extra inputs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <Tag size={14} style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="Category (e.g. Energy)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem', width: '130px', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <MapPin size={14} style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="City / Region"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem', width: '110px', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <ImageIcon size={14} style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem', width: '110px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Footer publish button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <button
            onClick={handleCreatePost}
            disabled={submitting || !text.trim()}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            <Send size={15} />
            {submitting ? 'Publishing...' : t('feed.postBtn')}
          </button>
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading community feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <Sparkles size={36} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
          <h3>No posts yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Be the first to publish an update or trade listing.</p>
        </div>
      ) : (
        posts.map((post) => {
          if (post.isSponsored) {
            return <SponsoredPostCard key={post.id} post={post} />;
          }

          const isLiked = likedPosts[post.id];
          const likesCount = (post._count?.likes || 0) + (isLiked ? 1 : 0);

          return (
            <article key={post.id} className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
              {/* Author & Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                    border: '1px solid var(--border-accent)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                  }}>
                    {post.author?.displayName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{post.author?.displayName || 'Creator'}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{post.author?.afriqoraId || 'Verified Member'}</span>
                      {post.location && <span>• {post.location}</span>}
                    </div>
                  </div>
                </div>

                {post.category && (
                  <span className="badge badge-cyan">{post.category}</span>
                )}
              </div>

              {/* Title & Body */}
              {post.title && <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{post.title}</h3>}
              <p style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{post.text || post.content}</p>

              {/* Media Preview */}
              {post.image && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={post.image} alt={post.title || 'Post media'} style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }} />
                </div>
              )}

              {/* Engagement Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border)',
                paddingTop: '0.85rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="btn btn-ghost"
                    style={{
                      padding: '0.3rem 0.5rem',
                      color: isLiked ? 'var(--red)' : 'inherit',
                      gap: '0.35rem',
                    }}
                  >
                    <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{likesCount}</span>
                  </button>

                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', gap: '0.35rem' }}>
                    <MessageCircle size={17} />
                    <span>{post._count?.comments || 0}</span>
                  </button>

                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', gap: '0.35rem' }}>
                    <Share2 size={17} />
                    <span>{post._count?.shares || 0}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                  <Eye size={14} />
                  <span>Monetized View Tracking Active</span>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};
