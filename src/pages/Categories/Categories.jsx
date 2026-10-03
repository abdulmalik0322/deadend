import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './Categories.css';

export default function Categories() {
  useDocumentTitle('Categories — DEADEND');

  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(false);

  const fetchCategories = () => {
    setError(false);
    api
      .listCategories()
      .then((res) => {
        setCategories(Array.isArray(res) ? res : res.items || res.categories || []);
      })
      .catch(() => {
        setError(true);
        setCategories([]);
      });
  };

  useEffect(fetchCategories, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="categories">
      <div className="categories__wrap">
        <header className="categories__head">
          <h1 className="categories__title">Categories</h1>
          <p className="categories__sub">
            Browse experiences by the kind of path they describe — every story is filed
            where someone considering that path will find it.
          </p>
        </header>

        {categories === null && !error ? (
          <div className="categories__grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Could not load categories"
            message="Something went wrong while fetching categories. Please try again."
            onRetry={fetchCategories}
          />
        ) : categories.length === 0 ? (
          <ErrorState
            title="No categories yet"
            message="Categories will appear here once experiences are added."
            action={<Link className="btn btn-amber" to="/explore">Browse experiences</Link>}
          />
        ) : (
          <div className="categories__grid">
            {categories.map((c) => (
              <article key={c.slug || c.id} className="cat-card">
                <Link className="cat-card__main" to={`/categories/${c.slug}`}>
                  <span className="cat-card__icon">
                    <Icon name={c.icon || 'folder'} size={24} />
                  </span>
                  <h2 className="cat-card__name">{c.name}</h2>
                  {c.description && <p className="cat-card__desc">{c.description}</p>}
                  <span className="cat-card__count">
                    {c.experienceCount != null
                      ? `${c.experienceCount} ${c.experienceCount === 1 ? 'experience' : 'experiences'}`
                      : ''}
                  </span>
                </Link>
                {c.trending && c.trending.length > 0 && (
                  <div className="cat-card__trending">
                    <span className="cat-card__trending-label">
                      <Icon name="trending" size={13} /> Trending
                    </span>
                    <div className="cat-card__chips">
                      {c.trending.slice(0, 3).map((t) => (
                        <Link
                          key={t}
                          className="chip chip--sm"
                          to={`/explore?q=${encodeURIComponent(t)}`}
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
