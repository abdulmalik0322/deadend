import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './CategoryDetail.css';

export default function CategoryDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [experiences, setExperiences] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(category ? `${category.name} — DEADEND` : 'Category — DEADEND');

  useEffect(() => {
    let cancelled = false;
    setCategory(null);
    setExperiences(null);
    setNotFound(false);

    api
      .getCategory(slug)
      .then((res) => {
        if (cancelled) return;
        const cat = res.category || res;
        const list = res.experiences || res.items || [];
        if (!cat || (!cat.name && !cat.slug)) {
          setNotFound(true);
        } else {
          setCategory(cat);
          setExperiences(list);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const stats = useMemo(() => {
    if (!experiences) return null;
    const countries = new Set(experiences.map((e) => e.country).filter(Boolean));
    const contributors = new Set(
      experiences.map((e) => (e.author && (e.author.username || e.author.name)) || 'anonymous')
    );
    const successful = experiences.filter((e) => e.outcome === 'successful').length;
    return { total: experiences.length, countries: countries.size, contributors: contributors.size, successful };
  }, [experiences]);

  const popularExperiences = useMemo(() => {
    if (!experiences) return [];
    return [...experiences]
      .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
      .slice(0, 6);
  }, [experiences]);

  const trendingTopics = useMemo(() => {
    if (!experiences) return [];
    const counts = {};
    experiences.forEach((e) => {
      (e.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [experiences]);

  const popularSearches = useMemo(() => {
    if (category && category.popularSearches && category.popularSearches.length > 0) {
      return category.popularSearches;
    }
    return trendingTopics.slice(0, 6).map((t) => t.tag);
  }, [category, trendingTopics]);

  const loading = category === null && !notFound;

  if (notFound) {
    return (
      <div className="category-detail">
        <div className="category-detail__wrap">
          <ErrorState
            title="Category not found"
            message="This category does not exist or has been removed."
            action={<Link className="btn btn-amber" to="/categories">Browse categories</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="category-detail">
      <div className="category-detail__wrap">
        {/* Header */}
        <header className="category-detail__head">
          {loading ? (
            <div className="category-detail__head-skeleton">
              <div className="sk sk-icon" />
              <div className="sk sk-line" />
              <div className="sk sk-line sk-line--short" />
            </div>
          ) : (
            <>
              <span className="category-detail__icon">
                <Icon name={category.icon || 'folder'} size={30} />
              </span>
              <h1 className="category-detail__title">{category.name}</h1>
              {category.description && (
                <p className="category-detail__desc">{category.description}</p>
              )}
              {stats && (
                <div className="category-detail__stats">
                  <span className="category-detail__stat">
                    <Icon name="doc" size={15} /> {stats.total} {stats.total === 1 ? 'experience' : 'experiences'}
                  </span>
                  <span className="category-detail__stat">
                    <Icon name="globe" size={15} /> {stats.countries} {stats.countries === 1 ? 'country' : 'countries'}
                  </span>
                  <span className="category-detail__stat">
                    <Icon name="user" size={15} /> {stats.contributors} {stats.contributors === 1 ? 'contributor' : 'contributors'}
                  </span>
                  {stats.successful > 0 && (
                    <span className="category-detail__stat category-detail__stat--success">
                      <Icon name="check" size={15} /> {stats.successful} successful
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </header>

        {/* Popular searches */}
        {!loading && popularSearches.length > 0 && (
          <section className="category-detail__block">
            <h2 className="category-detail__h2">Popular searches</h2>
            <div className="category-detail__chips">
              {popularSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => navigate(`/explore?q=${encodeURIComponent(s)}`)}
                >
                  <Icon name="search" size={13} /> {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular experiences */}
        <section className="category-detail__block">
          <div className="category-detail__block-head">
            <h2 className="category-detail__h2">Popular experiences</h2>
            <Link className="text-link" to={`/explore?category=${encodeURIComponent(slug)}`}>
              View all <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="category-detail__grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : popularExperiences.length > 0 ? (
            <div className="category-detail__grid">
              {popularExperiences.map((e) => (
                <ExperienceCard key={e.id || e.slug} experience={e} />
              ))}
            </div>
          ) : (
            <p className="category-detail__muted">No experiences in this category yet.</p>
          )}
        </section>

        {/* Trending topics */}
        {!loading && trendingTopics.length > 0 && (
          <section className="category-detail__block">
            <h2 className="category-detail__h2">Trending topics</h2>
            <ul className="category-detail__topics">
              {trendingTopics.map(({ tag, count }) => (
                <li key={tag}>
                  <Link to={`/explore?q=${encodeURIComponent(tag)}`} className="topic-row">
                    <span className="topic-row__tag">
                      <Icon name="tag" size={14} /> {tag}
                    </span>
                    <span className="topic-row__count">
                      {count} {count === 1 ? 'story' : 'stories'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
