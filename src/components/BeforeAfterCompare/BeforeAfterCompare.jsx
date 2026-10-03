import './BeforeAfterCompare.css';

const ROWS = [
  { key: 'investment', label: 'Investment' },
  { key: 'duration', label: 'Duration' },
  { key: 'result', label: 'Result' },
];

export default function BeforeAfterCompare({
  before = {},
  after = {},
  labels = {},
  deltas = {},
}) {
  const beforeLabel = labels.before ?? 'BEFORE';
  const afterLabel = labels.after ?? 'AFTER';

  return (
    <div className="ba-compare">
      <div className="ba-col">
        <div className="ba-col-head ba-col-head--before">{beforeLabel}</div>
        <div className="ba-rows">
          {ROWS.map((row) => (
            <div key={row.key} className="ba-row">
              <span className="ba-row-label">{row.label}</span>
              <span className="ba-row-value">{before[row.key] ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ba-col">
        <div className="ba-col-head ba-col-head--after">{afterLabel}</div>
        <div className="ba-rows">
          {ROWS.map((row) => (
            <div key={row.key} className="ba-row">
              <span className="ba-row-label">{row.label}</span>
              <span className="ba-row-value">
                {after[row.key] ?? '—'}
                {deltas[row.key] && (
                  <span className="ba-delta">{deltas[row.key]}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
