import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import OutcomeBadge from '../../components/OutcomeBadge/OutcomeBadge.jsx';
import TagList from '../../components/TagList/TagList.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import { timeAgo } from '../../utils/format.js';
import './ExperienceCard.css';

export default function ExperienceCard({ experience }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(Boolean(experience.saved));
  const [saving, setSaving] = useState(false);

  const author = experience.author || {};
  const authorName = author.name || 'Anonymous';
  const detailPath = `/experiences/${experience.slug}`;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('Log in to save experiences.');
      navigate('/login', { state: { from: detailPath } });
      return;
    }
    try {
      setSaving(true);
      if (saved) {
        await api.unsaveExperience(experience.id);
        setSaved(false);
        toast.success('Removed from your saved list.');
      } else {
        await api.saveExperience(experience.id);
        setSaved(true);
        toast.success('Experience saved.');
      }
    } catch {
      toast.error('Could not update saved status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const url = `${window.location.origin}${base}${detailPath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  return (
    <article className="exp-card">
      <Link className="exp-card__title" to={detailPath}>
        {experience.title}
      </Link>

      <p className="exp-card__line">
        {experience.categoryLabel || experience.category}
        {experience.country ? ` · ${experience.country}` : ''}
      </p>

      <div className="exp-card__meta">
        {experience.duration && (
          <span className="exp-card__meta-item">
            <Icon name="clock" size={14} /> {experience.duration}
          </span>
        )}
        {experience.investmentDisplay && (
          <span className="exp-card__meta-item">
            <Icon name="wallet" size={14} /> {experience.investmentDisplay}
          </span>
        )}
      </div>

      <OutcomeBadge outcome={experience.outcome} />

      {experience.mainObstacle && (
        <p className="exp-card__obstacle">
          <strong>Main obstacle:</strong> {experience.mainObstacle}
        </p>
      )}

      {experience.description && (
        <p className="exp-card__desc">{experience.description}</p>
      )}

      {experience.tags && experience.tags.length > 0 && (
        <TagList tags={experience.tags.slice(0, 3)} />
      )}

      <div className="exp-card__author">
        <Avatar name={authorName} initials={author.initials} size={32} />
        <div className="exp-card__author-text">
          <span className="exp-card__author-name">{authorName}</span>
          <span className="exp-card__time">{timeAgo(experience.createdAt)}</span>
        </div>
      </div>

      <div className="exp-card__actions">
        <Link className="btn btn-amber btn-sm" to={detailPath}>
          Read Experience <Icon name="arrowRight" size={14} />
        </Link>
        <button
          type="button"
          className={`btn btn-ghost btn-sm${saved ? ' is-saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
          aria-pressed={saved}
        >
          <Icon name="bookmark" size={14} /> {saved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={handleShare}
          aria-label="Share this experience"
          title="Copy link"
        >
          <Icon name="share" size={14} />
        </button>
      </div>
    </article>
  );
}
