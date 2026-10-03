import './ProgressBar.css';

export default function ProgressBar({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-bar">
      {label && (
        <div className="progress-bar-label">
          <span>{label}</span>
          <span className="progress-bar-pct">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
