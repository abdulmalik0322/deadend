import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import OutcomeBadge from '../../components/OutcomeBadge/OutcomeBadge.jsx';
import TagList from '../../components/TagList/TagList.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import SimilarityCard from '../../components/SimilarityCard/SimilarityCard.jsx';
import CommentThread from '../../components/CommentThread/CommentThread.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, timeAgo } from '../../utils/format.js';
import './ExperienceDetail.css';

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'False information',
  'Privacy violation',
  'Dangerous content',
  'Other',
];

export default function ExperienceDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [similar, setSimilar] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  useDocumentTitle(exp ? `${exp.title} — DEADEND` : 'Experience — DEADEND');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setExp(null);
    setSimilar(null);

    api
      .getExperience(slug)
      .then((e) => {
        if (cancelled) return;
        if (!e) {
          setNotFound(true);
        } else {
          setExp(e);
          setSaved(Boolean(e.saved));
          const sp = e.startingPoint || {};
          api
            .findSimilar({
              goal: e.goal,
              country: e.country,
              category: e.category,
              experienceLevel: sp.experienceLevel,
              budget: sp.budget,
              skills: Array.isArray(sp.skills) ? sp.skills.join(', ') : sp.skills,
              excludeId: e.id,
            })
            .then((r) => {
              if (cancelled) return;
              const results = (r.results || []).filter((x) => x.experience.id !== e.id);
              setSimilar(results.slice(0, 3));
            })
            .catch(() => {
              if (!cancelled) setSimilar([]);
            });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const requireLogin = (message, from) => {
    toast.info(message);
    navigate('/login', { state: { from: from || `/experiences/${slug}` } });
  };

  const handleSave = async () => {
    if (!user) {
      requireLogin('Log in to save experiences.');
      return;
    }
    try {
      setSaving(true);
      if (saved) {
        await api.unsaveExperience(exp.id);
        setSaved(false);
        toast.success('Removed from your saved list.');
      } else {
        await api.saveExperience(exp.id);
        setSaved(true);
        toast.success('Experience saved.');
      }
    } catch {
      toast.error('Could not update saved status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const openReport = () => {
    if (!user) {
      requireLogin('Log in to report content.');
      return;
    }
    setReportReason('');
    setReportDetails('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      toast.error('Please choose a reason for your report.');
      return;
    }
    try {
      setReporting(true);
      await api.reportContent({ experienceId: exp.id, reason: reportReason, details: reportDetails });
      setReportOpen(false);
      toast.success('Thanks — our moderators will review this.');
    } catch {
      toast.error('Could not submit the report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="detail detail--loading">
        <div className="detail__wrap">
          <SkeletonText lines={2} />
          <div className="detail__skeleton-grid">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !exp) {
    return (
      <div className="detail">
        <div className="detail__wrap">
          <ErrorState
            title="Experience not found"
            message="This experience may have been removed, or the link is incorrect."
            action={<Link className="btn btn-amber" to="/explore">Browse experiences</Link>}
          />
        </div>
      </div>
    );
  }

  const author = exp.author || {};
  const authorName = author.name || 'Anonymous';
  const sp = exp.startingPoint || {};
  const investment = exp.investment || {};
  const doDifferently = (exp.doDifferently && exp.doDifferently.length > 0 ? exp.doDifferently : exp.lessons) || [];

  const startPointItems = [
    { icon: 'doc', label: 'Education', value: sp.education },
    { icon: 'chart', label: 'Experience level', value: sp.experienceLevel },
    { icon: 'wallet', label: 'Budget', value: sp.budget },
    { icon: 'clock', label: 'Available time', value: sp.timeAvailable },
    { icon: 'pin', label: 'Location', value: sp.location },
    { icon: 'zap', label: 'Skills', value: Array.isArray(sp.skills) ? sp.skills.join(', ') : sp.skills },
  ];

  return (
    <div className="detail">
      <div className="detail__wrap">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/explore">Explore</Link>
          <Icon name="chevronDown" size={12} className="breadcrumb__sep" />
          {exp.category && (
            <>
              <Link to={`/explore?category=${encodeURIComponent(exp.category)}`}>
                {exp.categoryLabel || exp.category}
              </Link>
              <Icon name="chevronDown" size={12} className="breadcrumb__sep" />
            </>
          )}
          <span className="breadcrumb__current">{exp.title}</span>
        </nav>

        {/* Header */}
        <header className="detail__header">
          <div className="detail__chips">
            {exp.categoryLabel && <span className="detail__category">{exp.categoryLabel}</span>}
            <OutcomeBadge outcome={exp.outcome} />
          </div>
          <h1 className="detail__title">{exp.title}</h1>
          <div className="detail__meta">
            <span className="detail__author">
              <Avatar name={authorName} initials={author.initials} size={30} />
              <span>{authorName}</span>
            </span>
            <span className="detail__meta-item">
              <Icon name="calendar" size={14} /> {formatDate(exp.createdAt)}
            </span>
            {exp.country && (
              <span className="detail__meta-item">
                <Icon name="pin" size={14} /> {exp.country}
              </span>
            )}
            {exp.stats && (
              <span className="detail__meta-item">
                <Icon name="eye" size={14} /> {exp.stats.views} views
              </span>
            )}
          </div>
          <div className="detail__actions">
            <button
              type="button"
              className={`btn btn-ghost btn-sm${saved ? ' is-saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
              aria-pressed={saved}
            >
              <Icon name="bookmark" size={14} /> {saved ? 'Saved' : 'Save'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleShare}>
              <Icon name="share" size={14} /> Share
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={openReport}>
              <Icon name="flag" size={14} /> Report
            </button>
          </div>
        </header>

        {/* Starting point */}
        {startPointItems.some((i) => i.value) && (
          <section className="detail__section">
            <h2 className="detail__h2">Starting Point</h2>
            <div className="detail__start-grid">
              {startPointItems.filter((i) => i.value).map((i) => (
                <div className="detail__start-item" key={i.label}>
                  <span className="detail__start-icon">
                    <Icon name={i.icon} size={18} />
                  </span>
                  <div>
                    <p className="detail__start-label">{i.label}</p>
                    <p className="detail__start-value">{i.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Goal */}
        {exp.goal && (
          <section className="detail__section">
            <h2 className="detail__h2">The Goal</h2>
            <blockquote className="detail__quote">
              <Icon name="quote" size={22} />
              <p>{exp.goal}</p>
            </blockquote>
          </section>
        )}

        {/* Timeline */}
        {exp.timeline && exp.timeline.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__h2">What They Tried</h2>
            <ol className="detail__timeline">
              {exp.timeline.map((t, i) => (
                <li key={i} className="detail__timeline-item">
                  <span className="detail__timeline-dot" aria-hidden="true" />
                  <div>
                    <p className="detail__timeline-label">{t.label}</p>
                    <p className="detail__timeline-text">{t.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Investment */}
        {(investment.money || investment.time || (investment.tools && investment.tools.length > 0) || exp.investmentDisplay) && (
          <section className="detail__section">
            <h2 className="detail__h2">Investment</h2>
            <div className="detail__invest-grid">
              {(investment.money || exp.investmentDisplay) && (
                <div className="detail__invest-card">
                  <span className="detail__invest-icon"><Icon name="wallet" size={20} /></span>
                  <p className="detail__invest-label">Money</p>
                  <p className="detail__invest-value">{investment.money || exp.investmentDisplay}</p>
                </div>
              )}
              {(investment.time || exp.duration) && (
                <div className="detail__invest-card">
                  <span className="detail__invest-icon"><Icon name="clock" size={20} /></span>
                  <p className="detail__invest-label">Time</p>
                  <p className="detail__invest-value">{investment.time || exp.duration}</p>
                </div>
              )}
              {investment.tools && investment.tools.length > 0 && (
                <div className="detail__invest-card">
                  <span className="detail__invest-icon"><Icon name="briefcase" size={20} /></span>
                  <p className="detail__invest-label">Tools</p>
                  <p className="detail__invest-value">{investment.tools.join(', ')}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Outcome */}
        <section className="detail__section">
          <h2 className="detail__h2">Outcome</h2>
          <div className="detail__outcome">
            <OutcomeBadge outcome={exp.outcome} />
            <p className="detail__outcome-text">
              The author recorded this outcome for their experience, {timeAgo(exp.createdAt)}.
            </p>
          </div>
        </section>

        {/* Obstacles */}
        {exp.obstacles && exp.obstacles.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__h2">What Went Wrong</h2>
            <ul className="detail__list detail__list--alert">
              {exp.obstacles.map((o, i) => (
                <li key={i}>
                  <Icon name="alert" size={16} />
                  <span>{typeof o === 'string' ? o : o.text || o.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* What worked */}
        {exp.whatWorked && exp.whatWorked.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__h2">What Worked</h2>
            <ul className="detail__list detail__list--check">
              {exp.whatWorked.map((w, i) => (
                <li key={i}>
                  <Icon name="check" size={16} />
                  <span>{typeof w === 'string' ? w : w.text || w.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Do differently */}
        {doDifferently.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__h2">What I Would Do Differently</h2>
            <ol className="detail__numbered">
              {doDifferently.map((d, i) => (
                <li key={i}>{typeof d === 'string' ? d : d.text || d.label}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Tags */}
        {exp.tags && exp.tags.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__h2">Tags</h2>
            <TagList tags={exp.tags} />
          </section>
        )}

        {/* Comments */}
        <section className="detail__section">
          <h2 className="detail__h2">Discussion</h2>
          <CommentThread experienceId={exp.id} />
        </section>

        {/* Similar */}
        <section className="detail__section">
          <h2 className="detail__h2">People in Similar Situations</h2>
          {similar === null ? (
            <div className="detail__similar-grid">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : similar.length > 0 ? (
            <div className="detail__similar-grid">
              {similar.map((r) => (
                <SimilarityCard
                  key={r.experience.id || r.experience.slug}
                  experience={r.experience}
                  score={r.score}
                  factors={r.factors}
                />
              ))}
            </div>
          ) : (
            <p className="detail__muted">No closely similar experiences found yet.</p>
          )}
          <p className="detail__disclaimer">
            Similarity is based on starting point, goal, and constraints — not on outcomes.
          </p>
        </section>
      </div>

      {/* Report modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this experience">
        <p className="report__intro">Why are you reporting this experience? Our moderators will review it.</p>
        <div className="report__reasons" role="radiogroup" aria-label="Report reason">
          {REPORT_REASONS.map((r) => (
            <label key={r} className={`report__reason${reportReason === r ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reportReason === r}
                onChange={() => setReportReason(r)}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>
        <label className="report__details-label" htmlFor="report-details">
          Details (optional)
        </label>
        <textarea
          id="report-details"
          className="report__details"
          rows={4}
          placeholder="Add any context that helps our moderators…"
          value={reportDetails}
          onChange={(e) => setReportDetails(e.target.value)}
        />
        <div className="report__actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-amber btn-sm" onClick={submitReport} disabled={reporting}>
            {reporting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
