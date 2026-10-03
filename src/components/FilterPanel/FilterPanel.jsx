import { useEffect, useState } from 'react';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import './FilterPanel.css';

const OUTCOMES = [
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'mixed', label: 'Mixed results' },
  { value: 'in-progress', label: 'In progress' },
];

const BUDGETS = ['Any', 'Under $500', '$500–$2k', '$2k–$10k', '$10k+'];
const LEVELS = ['Any', 'Beginner', 'Intermediate', 'Advanced'];
const TIMES = ['Any', 'Under 5 hrs/week', '5–15 hrs/week', '15–30 hrs/week', '30+ hrs/week'];

const COMMON_COUNTRIES = [
  'Pakistan', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'India', 'United Arab Emirates', 'Saudi Arabia', 'Philippines', 'Nigeria', 'Bangladesh',
];

export const EMPTY_FILTERS = {
  category: '',
  country: '',
  goal: '',
  outcomes: [],
  budget: 'Any',
  experienceLevel: 'Any',
  timeAvailable: 'Any',
  skills: '',
  tags: '',
};

export default function FilterPanel({ filters, onChange, counts }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .listCategories()
      .then((res) => {
        if (cancelled) return;
        setCategories(Array.isArray(res) ? res : res.items || res.categories || []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const toggleOutcome = (value) => {
    const current = filters.outcomes || [];
    const next = current.includes(value)
      ? current.filter((o) => o !== value)
      : [...current, value];
    set('outcomes', next);
  };

  const activeCount = Object.entries(filters || {}).reduce((n, [key, v]) => {
    if (key === 'outcomes') return n + (v && v.length ? v.length : 0);
    if (['budget', 'experienceLevel', 'timeAvailable'].includes(key)) {
      return n + (v && v !== 'Any' ? 1 : 0);
    }
    return n + (v ? 1 : 0);
  }, 0);

  const countFor = (key) => (counts && counts[key] != null ? ` (${counts[key]})` : '');

  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <span className="filter-panel__title">
          <Icon name="filter" size={16} /> Filters
          {activeCount > 0 && <span className="filter-panel__badge">{activeCount}</span>}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            className="filter-panel__clear"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
          >
            Clear all
          </button>
        )}
      </div>

      <details className="filter-group" open>
        <summary>
          Category{countFor('category')} <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <select
            value={filters.category || ''}
            onChange={(e) => set('category', e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug || c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </details>

      <details className="filter-group" open>
        <summary>
          Country{countFor('country')} <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <input
            type="text"
            list="filter-countries"
            placeholder="e.g. Pakistan"
            value={filters.country || ''}
            onChange={(e) => set('country', e.target.value)}
            aria-label="Filter by country"
          />
          <datalist id="filter-countries">
            {COMMON_COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </details>

      <details className="filter-group" open>
        <summary>
          Goal <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <input
            type="text"
            placeholder="e.g. Start freelancing"
            value={filters.goal || ''}
            onChange={(e) => set('goal', e.target.value)}
            aria-label="Filter by goal"
          />
        </div>
      </details>

      <details className="filter-group" open>
        <summary>
          Outcome <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body filter-group__checks">
          {OUTCOMES.map((o) => (
            <label key={o.value} className="filter-check">
              <input
                type="checkbox"
                checked={(filters.outcomes || []).includes(o.value)}
                onChange={() => toggleOutcome(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="filter-group">
        <summary>
          Budget <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <select
            value={filters.budget || 'Any'}
            onChange={(e) => set('budget', e.target.value)}
            aria-label="Filter by budget"
          >
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {b === 'Any' ? 'Any budget' : b}
              </option>
            ))}
          </select>
        </div>
      </details>

      <details className="filter-group">
        <summary>
          Experience level <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <select
            value={filters.experienceLevel || 'Any'}
            onChange={(e) => set('experienceLevel', e.target.value)}
            aria-label="Filter by experience level"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === 'Any' ? 'Any level' : l}
              </option>
            ))}
          </select>
        </div>
      </details>

      <details className="filter-group">
        <summary>
          Time available <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <select
            value={filters.timeAvailable || 'Any'}
            onChange={(e) => set('timeAvailable', e.target.value)}
            aria-label="Filter by time available"
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t === 'Any' ? 'Any amount of time' : t}
              </option>
            ))}
          </select>
        </div>
      </details>

      <details className="filter-group">
        <summary>
          Skills <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <input
            type="text"
            placeholder="e.g. design, coding"
            value={filters.skills || ''}
            onChange={(e) => set('skills', e.target.value)}
            aria-label="Filter by skills, comma separated"
          />
          <p className="filter-hint">Separate multiple skills with commas.</p>
        </div>
      </details>

      <details className="filter-group">
        <summary>
          Tags <Icon name="chevronDown" size={16} />
        </summary>
        <div className="filter-group__body">
          <input
            type="text"
            placeholder="e.g. remote, startup"
            value={filters.tags || ''}
            onChange={(e) => set('tags', e.target.value)}
            aria-label="Filter by tags"
          />
        </div>
      </details>
    </div>
  );
}
