import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import { formatDate } from '../../utils/format.js';
import './Profile.css';

export default function Profile() {
  const { username } = useParams();
  const { user: viewer, updateProfile } = useAuth();
  const revealRef = useReveal();
  const { toast } = useToast();
  useDocumentTitle(`@${username} · DEADEND`);

  const isOwner = Boolean(viewer && viewer.username === username);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stories, setStories] = useState([]);
  const [storiesTotal, setStoriesTotal] = useState(0);
  const [authorInfo, setAuthorInfo] = useState(null);
  const [tab, setTab] = useState('stories');
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    country: '',
    publicProfile: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listExperiences({
        filters: { authorUsername: username },
        sort: 'recent',
        page: 1,
        perPage: 12,
      });
      const items = Array.isArray(res) ? res : res?.items ?? res?.experiences ?? [];
      setStories(items);
      setStoriesTotal(Array.isArray(res) ? items.length : res?.total ?? items.length);
      setAuthorInfo(items[0]?.author ?? null);
    } catch (err) {
      setError(err?.message || 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  // Build the visible profile from the richest available source.
  const profile = isOwner
    ? {
        name: viewer?.name || username,
        username,
        bio: viewer?.bio || '',
        country: viewer?.country || '',
        publicProfile: viewer?.publicProfile !== false,
        joinedAt: viewer?.createdAt || viewer?.joinedAt,
        stats: viewer?.stats,
      }
    : {
        name: authorInfo?.name || username,
        username,
        bio: authorInfo?.bio || '',
        country: authorInfo?.country || '',
        publicProfile: authorInfo?.publicProfile,
        joinedAt: authorInfo?.createdAt || authorInfo?.joinedAt,
        stats: authorInfo?.stats,
      };

  const isPrivate = !isOwner && profile.publicProfile === false;

  const openEdit = () => {
    setEditForm({
      name: viewer?.name || '',
      bio: viewer?.bio || '',
      country: viewer?.country || '',
      publicProfile: viewer?.publicProfile !== false,
    });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: editForm.name.trim(),
        bio: editForm.bio.trim(),
        country: editForm.country.trim(),
        publicProfile: editForm.publicProfile,
      });
      toast.success('Profile updated.');
      setEditOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const statItems = [
    { label: 'Experiences shared', value: storiesTotal },
    {
      label: 'Decisions completed',
      value: profile.stats?.decisionsCompleted ?? '—',
    },
    { label: 'Contributions', value: profile.stats?.contributions ?? '—' },
  ];

  return (
    <div ref={revealRef} className="page profile-page">
      {loading && (
        <>
          <div className="profile-header-skeleton">
            <SkeletonCard />
          </div>
          <SkeletonText lines={3} />
        </>
      )}

      {!loading && error && (
        <ErrorState title="Profile failed to load" body={error} onRetry={load} />
      )}

      {!loading && !error && isPrivate && (
        <div className="card private-card">
          <Icon name="lock" />
          <h2 className="private-title">This profile is private.</h2>
          <p className="private-text">
            @{username} has chosen to keep their profile visible only to themselves.
          </p>
        </div>
      )}

      {!loading && !error && !isPrivate && (
        <>
          <header className="profile-header card">
            <Avatar name={profile.name} size={96} />
            <div className="profile-identity">
              <h1 className="profile-name">{profile.name}</h1>
              <p className="profile-username">@{profile.username}</p>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-meta">
                {profile.publicProfile && profile.country && (
                  <span className="meta-item">
                    <Icon name="pin" /> {profile.country}
                  </span>
                )}
                {profile.joinedAt && (
                  <span className="meta-item">
                    <Icon name="calendar" /> Joined {formatDate(profile.joinedAt)}
                  </span>
                )}
                {!profile.publicProfile && isOwner && (
                  <span className="meta-item private-flag">
                    <Icon name="lock" /> Private profile
                  </span>
                )}
              </div>
            </div>
            {isOwner && (
              <button type="button" className="btn btn-ghost edit-btn" onClick={openEdit}>
                <Icon name="edit" /> Edit profile
              </button>
            )}
          </header>

          <div className="stats-row" aria-label="Profile stats">
            {statItems.map((s) => (
              <div key={s.label} className="stat-item">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="tabs" role="tablist" aria-label="Profile sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'stories'}
              className={`tab ${tab === 'stories' ? 'active' : ''}`}
              onClick={() => setTab('stories')}
            >
              Stories
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'about'}
              className={`tab ${tab === 'about' ? 'active' : ''}`}
              onClick={() => setTab('about')}
            >
              About
            </button>
          </div>

          {tab === 'stories' && (
            <section className="tab-panel" aria-label="Stories">
              {stories.length === 0 ? (
                <EmptyState
                  icon="doc"
                  title={isOwner ? 'You have not shared any stories yet.' : `@${username} has not shared any stories yet.`}
                  body={
                    isOwner
                      ? 'Your experiences help others decide with real evidence. Share your first one.'
                      : 'Check back later — new stories may appear here.'
                  }
                />
              ) : (
                <div className="stories-grid">
                  {stories.map((e) => (
                    <ExperienceCard key={e.id} experience={e} />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'about' && (
            <section className="card about-panel" aria-label="About">
              <h3 className="section-label">About</h3>
              {profile.bio ? (
                <p className="about-bio">{profile.bio}</p>
              ) : (
                <p className="about-empty">No bio added yet.</p>
              )}
              <dl className="about-list">
                <div className="about-row">
                  <dt>Username</dt>
                  <dd>@{profile.username}</dd>
                </div>
                {profile.publicProfile && profile.country && (
                  <div className="about-row">
                    <dt>Country</dt>
                    <dd>{profile.country}</dd>
                  </div>
                )}
                {profile.joinedAt && (
                  <div className="about-row">
                    <dt>Member since</dt>
                    <dd>{formatDate(profile.joinedAt)}</dd>
                  </div>
                )}
                <div className="about-row">
                  <dt>Experiences shared</dt>
                  <dd>{storiesTotal}</dd>
                </div>
              </dl>
              <p className="privacy-note">
                <Icon name="lock" />
                Only information marked public is visible to others. Your email and
                private details are never shown on your profile.
              </p>
            </section>
          )}

          <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
            <form onSubmit={handleSave}>
              <div className="modal-fields">
                <div className="field">
                  <label className="label" htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    className="input"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="profile-bio">Bio</label>
                  <textarea
                    id="profile-bio"
                    className="textarea"
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="A line or two about what you do and what you're working toward."
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="profile-country">Country</label>
                  <input
                    id="profile-country"
                    className="input"
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="e.g. Pakistan"
                  />
                </div>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={editForm.publicProfile}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, publicProfile: e.target.checked }))
                    }
                  />
                  <span>
                    <strong>Public profile</strong>
                    <small>When off, other people see “This profile is private.”</small>
                  </span>
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
