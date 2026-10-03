import { Link } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import './SimilarityCard.css';

function toPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

export default function SimilarityCard({ experience, score, factors = [] }) {
  const pct = toPercent(score);
  const circumference = 2 * Math.PI * 30;

  return (
    <article className="sim-card">
      <div className="sim-card__head">
        <div
          className="sim-card__ring"
          role="img"
          aria-label={`${pct}% similar`}
          title={`${pct}% similar`}
        >
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle className="sim-card__ring-bg" cx="36" cy="36" r="30" />
            <circle
              className="sim-card__ring-fg"
              cx="36"
              cy="36"
              r="30"
              strokeDasharray={`${((pct / 100) * circumference).toFixed(1)} ${circumference.toFixed(1)}`}
            />
          </svg>
          <span className="sim-card__score">{pct}%</span>
        </div>
        <div className="sim-card__head-text">
          <span className="sim-card__label">similar</span>
          <Link className="sim-card__title" to={`/experiences/${experience.slug}`}>
            {experience.title}
          </Link>
          <span className="sim-card__sub">
            {experience.categoryLabel || experience.category}
            {experience.country ? ` · ${experience.country}` : ''}
          </span>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="sim-card__factors">
          {factors.slice(0, 4).map((f) => {
            const match = toPercent(f.match);
            return (
              <div className="sim-card__factor" key={f.key || f.label}>
                <div className="sim-card__factor-row">
                  <span className="sim-card__factor-label">{f.label}</span>
                  <span className="sim-card__factor-pct">{match}%</span>
                </div>
                <div
                  className="sim-card__bar"
                  role="progressbar"
                  aria-valuenow={match}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={f.label}
                >
                  <span style={{ width: `${match}%` }} />
                </div>
                {f.note && <p className="sim-card__factor-note">{f.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="sim-card__foot">
        <Link className="sim-card__link" to={`/experiences/${experience.slug}`}>
          View experience <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      <p className="sim-card__disclaimer">
        Platform-generated relevance score — similarity of situations, not a prediction.
      </p>
    </article>
  );
}
