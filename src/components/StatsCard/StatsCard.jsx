import { Icon } from '../../utils/icons.jsx';
import { formatNumber } from '../../utils/format.js';
import './StatsCard.css';

export default function StatsCard({ value, label, icon, suffix }) {
  const display = typeof value === 'number' ? formatNumber(value) : value;
  return (
    <div className="stats-card">
      {icon && (
        <span className="stats-card-icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
      )}
      <div className="stats-card-value">
        {display}
        {suffix && <span className="stats-card-suffix">{suffix}</span>}
      </div>
      <div className="stats-card-label">{label}</div>
    </div>
  );
}
