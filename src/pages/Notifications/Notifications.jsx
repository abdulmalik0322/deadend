import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import NotificationItem from '../../components/NotificationItem/NotificationItem.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './Notifications.css';

export default function Notifications() {
  useDocumentTitle('Notifications · DEADEND');
  const revealRef = useReveal();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listNotifications();
      setNotifications(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      setError(err?.message || 'Could not load your notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    try {
      await api.markNotificationRead(notification.id);
    } catch {
      // Optimistic update stands; the server will reconcile on next load.
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(err?.message || 'Could not mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={revealRef} className="page notifications-page">
      <header className="page-head notifications-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
              : 'Stay on top of comments, milestones and reminders.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <Icon name="check" />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </header>

      <div className="notifications-list" aria-live="polite">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <ErrorState
            title="Notifications failed to load"
            body={error}
            onRetry={load}
          />
        )}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState
            icon="bell"
            title="You're all caught up."
            body="New comments, approvals, reminders and milestones will appear here."
          />
        )}

        {!loading &&
          !error &&
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={handleRead} />
          ))}
      </div>
    </div>
  );
}
