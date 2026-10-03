import { Icon } from '../../utils/icons.jsx';
import './ErrorState.css';

export default function ErrorState({
  title = 'Something went wrong.',
  body,
  onRetry,
}) {
  return (
    <div className="error-state">
      <span className="error-state-icon" aria-hidden="true">
        <Icon name="alert" size={28} />
      </span>
      <h3 className="error-state-title">{title}</h3>
      {body && <p className="error-state-body">{body}</p>}
      {onRetry && (
        <button type="button" className="error-state-retry" onClick={onRetry}>
          <Icon name="arrowRight" size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
