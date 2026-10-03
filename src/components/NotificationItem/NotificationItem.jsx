import { useNavigate } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import { timeAgo } from '../../utils/format.js';
import './NotificationItem.css';

const TYPE_ICONS = {
  comment: 'message',
  reminder: 'bell',
  approval: 'check',
  save: 'bookmark',
  similar: 'sparkles',
  milestone: 'target',
};

const TYPE_TONES = {
  comment: 'info',
  reminder: 'warning',
  approval: 'success',
  save: 'accent',
  similar: 'accent',
  milestone: 'success',
};

export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  if (!notification) return null;

  const iconName = TYPE_ICONS[notification.type] || 'bell';
  const tone = TYPE_TONES[notification.type] || 'info';

  const handleClick = () => {
    if (!notification.read) {
      onRead?.(notification);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <button
      type="button"
      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
      onClick={handleClick}
    >
      <span className={`notification-icon tone-${tone}`}>
        <Icon name={iconName} />
      </span>
      <span className="notification-content">
        <span className="notification-row">
          <span className="notification-title">{notification.title}</span>
          {!notification.read && <span className="unread-dot" aria-label="Unread" />}
        </span>
        {notification.body && (
          <span className="notification-body">{notification.body}</span>
        )}
        <span className="notification-time">{timeAgo(notification.createdAt)}</span>
      </span>
      {notification.link && (
        <Icon name="arrowRight" className="notification-arrow" />
      )}
    </button>
  );
}
