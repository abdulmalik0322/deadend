import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import DecisionCard from '../../components/DecisionCard/DecisionCard.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './Decisions.css';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

export default function Decisions() {
  useDocumentTitle('Decisions | DEADEND');
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await api.listDecisions();
      setDecisions(Array.isArray(list) ? list : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { all: decisions.length, planning: 0, active: 0, completed: 0, abandoned: 0 };
    decisions.forEach((d) => {
      if (c[d.status] !== undefined) c[d.status] += 1;
    });
    return c;
  }, [decisions]);

  const filtered = useMemo(
    () => (tab === 'all' ? decisions : decisions.filter((d) => d.status === tab)),
    [decisions, tab]
  );

  return (
    <div className="decisions-page">
      <div className="decisions-container">
        <header className="decisions-header">
          <div>
            <h1>Decisions</h1>
            <p className="decisions-headline">Your next decision deserves better research.</p>
          </div>
          <Link to="/decisions/new" className="decisions-create-btn">
            <Icon name="plus" />
            Create a Decision
          </Link>
        </header>

        <nav className="decisions-tabs" aria-label="Filter decisions by status">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`decisions-tab${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
            >
              {t.label}
              <span className="decisions-tab-count">{counts[t.value]}</span>
            </button>
          ))}
        </nav>

        {loading && (
          <div className="decisions-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Could not load your decisions"
            body="Something went wrong while fetching your decisions. Please try again."
            onRetry={load}
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title="Your journey starts here."
            body={
              tab === 'all'
                ? 'Create your first decision and track it from idea to outcome — with real evidence along the way.'
                : `You have no ${tab} decisions yet.`
            }
            action={
              <Link to="/decisions/new" className="decisions-create-btn">
                <Icon name="plus" />
                Create a Decision
              </Link>
            }
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="decisions-grid">
            {filtered.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
