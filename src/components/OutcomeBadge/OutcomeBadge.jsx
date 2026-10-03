import './OutcomeBadge.css';

const LABELS = {
  successful: 'Successful',
  partially_successful: 'Partially Successful',
  unsuccessful: 'Unsuccessful',
  abandoned: 'Abandoned',
};

export default function OutcomeBadge({ outcome }) {
  const label = LABELS[outcome] ?? outcome;
  return <span className={`outcome-badge outcome-badge--${outcome}`}>{label}</span>;
}
