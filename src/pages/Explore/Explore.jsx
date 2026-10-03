import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import SearchBar from '../../components/SearchBar/SearchBar.jsx';
import FilterPanel, { EMPTY_FILTERS } from '../../components/FilterPanel/FilterPanel.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './Explore.css';

const SORTS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'discussed', label: 'Most Discussed' },
  { value: 'saved', label: 'Most Saved' },
];

const PER_PAGE = 9;

export default function Explore() {
  useDocumentTitle('Explore Experiences — DEADEND');

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchExperiences = () => {
    setLoading(true);
    setError(false);
    api
      .listExperiences({ filters: { ...filters, q }, sort, page, perPage: PER_PAGE })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(fetchExperiences, [q, filters, sort, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = (next) => {
    setFilters(next);
    setPage(1);
    setDrawerOpen(false);
  };

  const onSearch = (nextQ) => {
    setPage(1);
    setSearchParams(nextQ ? { q: nextQ } : {});
  };

  const onSortChange = (value) => {
    setSort(value);
    setPage(1);
  };

  const total = data ? data.total : 0;
  const items = data ? data.items || [] : [];

  return (
    <div className="explore">
      <div className="explore__wrap">
        <header className="explore__head">
          <h1 className="explore__title">Explore Experiences</h1>
          <p className="explore__sub">See what happened to people who tried it before you.</p>
          <div className="explore__search">
            <SearchBar key={q} initialValue={q} onSearch={onSearch} />
          </div>
        </header>

        <div className="explore__toolbar">
          <p className="explore__count" aria-live="polite">
            {loading ? 'Searching…' : `${total} ${total === 1 ? 'experience' : 'experiences'}`}
          </p>
          <div className="explore__toolbar-actions">
            <label className="explore__sort">
              <span className="explore__sort-label">Sort</span>
              <select value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label="Sort experiences">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm explore__filters-btn"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="filter" size={15} /> Filters
            </button>
          </div>
        </div>

        <div className="explore__layout">
          <aside className="explore__sidebar">
            <FilterPanel filters={filters} onChange={updateFilters} />
          </aside>

          <div className="explore__main">
            {loading ? (
              <div className="explore__grid">
                {Array.from({ length: PER_PAGE }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Could not load experiences"
                message="Something went wrong while fetching experiences. Please try again."
                onRetry={fetchExperiences}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="No matching experiences yet."
                body="Try changing your filters."
                action={
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => updateFilters({ ...EMPTY_FILTERS })}
                  >
                    Clear all filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="explore__grid">
                  {items.map((e) => (
                    <ExperienceCard key={e.id || e.slug} experience={e} />
                  ))}
                </div>
                {data.totalPages > 1 && (
                  <div className="explore__pagination">
                    <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div className={`explore__drawer-scrim${drawerOpen ? ' is-open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <div className={`explore__drawer${drawerOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Filters">
        <div className="explore__drawer-head">
          <span className="explore__drawer-title">Filters</span>
          <button type="button" className="explore__drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="explore__drawer-body">
          <FilterPanel filters={filters} onChange={updateFilters} />
        </div>
        <div className="explore__drawer-foot">
          <button type="button" className="btn btn-amber" onClick={() => setDrawerOpen(false)}>
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}
