import { useState } from 'react';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import SimilarityCard from '../../components/SimilarityCard/SimilarityCard.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './Similar.css';

const BUDGET_OPTIONS = [
  'Under $1,000',
  '$1,000 – $5,000',
  '$5,000 – $20,000',
  'Over $20,000',
  'No fixed budget',
];

const EXPERIENCE_OPTIONS = [
  'Beginner — starting from zero',
  'Some experience — tried this before',
  'Experienced — done this before',
];

const TIME_OPTIONS = [
  'Under 5 hours per week',
  '5–10 hours per week',
  '10–20 hours per week',
  'Full-time',
];

const MATCH_WEIGHTS = [
  { label: 'Goal', weight: '30%', note: 'How closely their goal matches yours' },
  { label: 'Category', weight: '15%', note: 'Same area of life or work' },
  { label: 'Budget', weight: '15%', note: 'Similar financial starting point' },
  { label: 'Experience level', weight: '15%', note: 'Similar background when they started' },
  { label: 'Time available', weight: '15%', note: 'Similar weekly time commitment' },
];

const emptyForm = {
  goal: '',
  country: '',
  budget: '',
  experienceLevel: '',
  timeAvailable: '',
  skills: '',
};

export default function Similar() {
  useDocumentTitle('Find Similar Experiences · DEADEND');
  const revealRef = useReveal();
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [totalInDataset, setTotalInDataset] = useState(0);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.goal.trim()) {
      toast.error('Please describe your goal first.');
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const payload = {
        goal: form.goal.trim(),
        country: form.country.trim(),
        budget: form.budget,
        experienceLevel: form.experienceLevel,
        timeAvailable: form.timeAvailable,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const data = await api.findSimilar(payload);
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotalInDataset(data.totalInDataset ?? 0);
    } catch (err) {
      setError(err?.message || 'Something went wrong while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setSearched(false);
    setResults([]);
    setTotalInDataset(0);
    setError(null);
  };

  return (
    <div ref={revealRef} className="page similar-page">
      <header className="page-head">
        <h1 className="page-title">Find Similar Experiences</h1>
        <p className="page-sub">
          Describe where you are right now. We will surface experiences from people
          who started from a similar place — so you can learn from what actually happened.
        </p>
      </header>

      <section className="card similar-form-card" aria-label="Your situation">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label className="label" htmlFor="similar-goal">Goal</label>
              <input
                id="similar-goal"
                className="input"
                type="text"
                placeholder="e.g. Launch a small online store selling handmade candles"
                value={form.goal}
                onChange={set('goal')}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="similar-country">Country</label>
              <input
                id="similar-country"
                className="input"
                type="text"
                placeholder="e.g. Pakistan"
                value={form.country}
                onChange={set('country')}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="similar-budget">Budget</label>
              <select id="similar-budget" className="select" value={form.budget} onChange={set('budget')}>
                <option value="">Select a range</option>
                {BUDGET_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="similar-experience">Experience</label>
              <select id="similar-experience" className="select" value={form.experienceLevel} onChange={set('experienceLevel')}>
                <option value="">Select your level</option>
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="similar-time">Time available</label>
              <select id="similar-time" className="select" value={form.timeAvailable} onChange={set('timeAvailable')}>
                <option value="">Select availability</option>
                {TIME_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label className="label" htmlFor="similar-skills">Skills</label>
              <input
                id="similar-skills"
                className="input"
                type="text"
                placeholder="Comma separated — e.g. design, marketing, coding"
                value={form.skills}
                onChange={set('skills')}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Icon name="search" />
              {loading ? 'Searching…' : 'Find similar experiences'}
            </button>
            {searched && (
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="similar-results" aria-live="polite">
        {loading && (
          <div className="results-grid">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Search failed"
            body={error}
            onRetry={handleSubmit}
          />
        )}

        {!loading && !error && !searched && (
          <EmptyState
            icon="compass"
            title="Describe your situation to begin"
            body="Fill in the form above — your goal, budget, experience and time — and we will find experiences from people who started from a similar place."
          />
        )}

        {!loading && !error && searched && results.length === 0 && (
          <EmptyState
            icon="search"
            title="No close matches in the current dataset"
            body="Try broadening your search — a wider budget range or fewer skills can surface more experiences."
          />
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="results-head">
              <div>
                <h2 className="results-title">Similar Experiences Found</h2>
                <p className="results-sub">
                  {totalInDataset} relevant experiences in the current dataset
                </p>
              </div>
            </div>
            <div className="results-grid">
              {results.map((r, i) => (
                <SimilarityCard
                  key={r.experience?.id ?? i}
                  experience={r.experience}
                  score={r.score}
                  factors={r.factors}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card similar-explainer" aria-label="How matching works">
        <h3 className="section-label">
          <Icon name="info" /> How matching works
        </h3>
        <p className="explainer-text">
          Each experience is compared against your situation across five signals.
          The relevance weights below decide how much each signal contributes to the ranking.
        </p>
        <ul className="weights-list">
          {MATCH_WEIGHTS.map((w) => (
            <li key={w.label} className="weight-row">
              <span className="weight-label">{w.label}</span>
              <span className="weight-note">{w.note}</span>
              <span className="weight-value">{w.weight}</span>
            </li>
          ))}
        </ul>
        <p className="explainer-footnote">
          These are relevance weights used to rank similar situations — not confidence scores.
        </p>
      </section>

      <aside className="disclaimer" role="note">
        <Icon name="shield" />
        <p>
          <strong>Platform-generated relevance score</strong> — it reflects similarity
          of situations, not a prediction of your outcome.
        </p>
      </aside>
    </div>
  );
}
