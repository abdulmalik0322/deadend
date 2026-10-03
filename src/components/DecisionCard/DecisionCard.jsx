import { Link } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import ProgressBar from '../../components/ProgressBar/ProgressBar.jsx';
import { timeAgo } from '../../utils/format.js';
import './DecisionCard.css';

const STATUS_META = {
  planning: { label: 'Planning', className: 'st-planning' },
  active: { label: 'Active', className: 'st-active' },
  completed: { label: 'Completed', className: 'st-completed' },
  abandoned: { label: 'Abandoned', className: 'st-abandoned' },
};

export default function DecisionCard({ decision }) {
  if (!decision) return null;

  const status = STATUS_META[decision.status] || STATUS_META.planning;
  const milestones = decision.milestones || [];
  const nextMilestone = milestones.find((m) => !m.done);
  const updates = decision.updates || [];
  const lastUpdateAt = updates.length > 0 ? updates[0].date : decision.createdAt;
  const progress = Math.max(0, Math.min(100, Number(decision.progress) || 0));

  return (
    <article className="decision-card">
      <div className="dc-top">
        <span className={`dc-status ${status.className}`}>{status.label}</span>
        <span className="dc-id" title="Decision ID">{decision.id}</span>
      </div>

      <Link to={`/decisions/${decision.id}`} className="dc-title">
        {decision.title}
      </Link>

      <div className="dc-progress">
        <ProgressBar value={progress} />
        <span className="dc-progress-label">{progress}%</span>
      </div>

      <dl className="dc-meta">
        <div className="dc-meta-row">
          <dt><Icon name="clock" /> Last update</dt>
          <dd>{lastUpdateAt ? timeAgo(lastUpdateAt) : '—'}</dd>
        </div>
        <div className="dc-meta-row">
          <dt><Icon name="target" /> Next milestone</dt>
          <dd className={nextMilestone ? '' : 'dc-muted'}>
            {nextMilestone ? nextMilestone.title : 'No open milestones'}
          </dd>
        </div>
      </dl>

      <div className="dc-foot">
        {decision.expectations?.investment && (
          <span className="dc-chip">
            <Icon name="wallet" />
            {decision.expectations.investment}
          </span>
        )}
        {decision.expectations?.duration && (
          <span className="dc-chip">
            <Icon name="calendar" />
            {decision.expectations.duration}
          </span>
        )}
      </div>
    </article>
  );
}
