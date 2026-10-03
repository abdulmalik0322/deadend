import { Icon } from '../../utils/icons.jsx';
import './EmptyState.css';

export default function EmptyState({ icon = 'compass', title, body, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {body && <p className="empty-state-body">{body}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
