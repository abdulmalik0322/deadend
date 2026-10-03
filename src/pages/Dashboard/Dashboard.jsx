import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import StatsCard from '../../components/StatsCard/StatsCard.jsx';
import DecisionCard from '../../components/DecisionCard/DecisionCard.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './Dashboard.css';

function normalizeExperiences(res) {
  if (Array.isArray(res)) return { items: res, total: res.length };
  return {
    items: res?.items ?? res?.experiences ?? [],
    total: res?.total ?? res?.items?.length ?? 0,
  };
}

export default function Dashboard() {
  useDocumentTitle('Dashboard · DEADEND');
  const revealRef = useReveal();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [saved, setSaved] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);

  const firstName = (user?.name || user?.username || 'there').split(' ')[0];
  const username = user?.username;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [decisionsRes, savedRes, experiencesRes, draftRes] = await Promise.all([
          api.listDecisions(),
          api.listSaved({}),
          api.listExperiences({ filters: {}, sort: 'recent', page: 1, perPage: 12 }),
          api.loadDraft('share').catch(() => null),
        ]);
        if (cancelled) return;
        const decisionList = Array.isArray(decisionsRes)
          ? decisionsRes
          : decisionsRes?.decisions ?? [];
        const savedList = Array.isArray(savedRes) ? savedRes : savedRes?.items ?? [];
        setDecisions(decisionList);
        setSaved(savedList);
        setExperiences(normalizeExperiences(experiencesRes).items);
        setHasDraft(Boolean(draftRes));
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load your dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = () => window.location.reload();

  const isActive = (d) => d.status === 'active' || (!d.completed && d.status !== 'completed');
  const activeDecisions = decisions.filter(isActive);
  const completedDecisions = decisions.filter((d) => !isActive(d));
  const myExperiences = username
    ? experiences.filter((e) => e.author?.username === username)
    : [];
  const recommended = username
    ? experiences.filter((e) => e.author?.username !== username).slice(0, 3)
    : experiences.slice(0, 3);

  const stats = {
    active: activeDecisions.length,
    completed: completedDecisions.length,
    shared: user?.stats?.experiencesShared ?? myExperiences.length,
    saved: saved.length,
  };

  const hasAnything =
    decisions.length > 0 || myExperiences.length > 0 || saved.length > 0;

  return (
    <div ref={revealRef} className="page dashboard-page">
      <header className="page-head">
        <h1 className="page-title">Welcome back, {firstName}</h1>
        <p className="page-sub">
          Your decisions, your stories, and what the community is learning — in one place.
        </p>
      </header>

      {loading && (
        <>
          <div className="stats-grid">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="dash-skeletons">
            <SkeletonText lines={2} />
            <div className="cards-grid">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </>
      )}

      {!loading && error && (
        <ErrorState title="Dashboard failed to load" body={error} onRetry={retry} />
      )}

      {!loading && !error && (
        <>
          <section className="stats-grid" aria-label="Your stats">
            <StatsCard label="Active Decisions" value={stats.active} icon="target" />
            <StatsCard label="Completed Decisions" value={stats.completed} icon="check" />
            <StatsCard label="Experiences Shared" value={stats.shared} icon="doc" />
            <StatsCard label="Saved Experiences" value={stats.saved} icon="bookmark" />
          </section>

          {hasDraft && (
            <Link to="/share" className="draft-banner">
              <Icon name="edit" />
              <span>
                <strong>You have an unfinished story draft.</strong>
                Pick up where you left off and publish it.
              </span>
              <Icon name="arrowRight" />
            </Link>
          )}

          {!hasAnything && (
            <EmptyState
              icon="compass"
              title="Your journey starts here."
              body="Track your first decision, share an experience, or save stories that resonate — your dashboard will come alive."
            />
          )}
          {!hasAnything && (
            <div className="empty-cta">
              <Link to="/decisions/new" className="btn btn-primary">
                <Icon name="plus" /> Start a decision
              </Link>
              <Link to="/share" className="btn btn-ghost">
                Share an experience
              </Link>
            </div>
          )}

          {activeDecisions.length > 0 && (
            <section className="dash-section">
              <div className="section-head">
                <h2 className="section-title">Active Decisions</h2>
                <Link to="/decisions" className="section-link">
                  View all <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="cards-grid">
                {activeDecisions.slice(0, 4).map((d) => (
                  <DecisionCard key={d.id} decision={d} />
                ))}
              </div>
            </section>
          )}

          {myExperiences.length > 0 && (
            <section className="dash-section">
              <div className="section-head">
                <h2 className="section-title">My Experiences</h2>
                {username && (
                  <Link to={`/profile/${username}`} className="section-link">
                    View all <Icon name="arrowRight" />
                  </Link>
                )}
              </div>
              <div className="cards-grid">
                {myExperiences.slice(0, 3).map((e) => (
                  <ExperienceCard key={e.id} experience={e} />
                ))}
              </div>
            </section>
          )}

          {saved.length > 0 && (
            <section className="dash-section">
              <div className="section-head">
                <h2 className="section-title">Saved</h2>
                <Link to="/saved" className="section-link">
                  View all <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="cards-grid">
                {saved.slice(0, 4).map((e) => (
                  <ExperienceCard key={e.id} experience={e} />
                ))}
              </div>
            </section>
          )}

          {recommended.length > 0 && (
            <section className="dash-section">
              <div className="section-head">
                <h2 className="section-title">Recommended for you</h2>
                <Link to="/experiences" className="section-link">
                  Browse all <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="cards-grid">
                {recommended.map((e) => (
                  <ExperienceCard key={e.id} experience={e} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
