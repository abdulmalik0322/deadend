import { Icon } from '../../utils/icons.jsx';
import './Pagination.css';

function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [1];
  if (page > 3) pages.push('…');
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
    pages.push(p);
  }
  if (page < totalPages - 2) pages.push('…');
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;

  const go = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    onChange(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="page-btn page-nav"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <Icon name="arrowLeft" size={16} />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="page-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`page-btn${p === page ? ' page-btn--active' : ''}`}
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="page-btn page-nav"
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <Icon name="arrowRight" size={16} />
      </button>
    </nav>
  );
}
