import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import { timeAgo } from '../../utils/format.js';
import './CommentThread.css';

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or hate',
  'Misinformation',
  'Inappropriate content',
  'Other',
];

export default function CommentThread({ experienceId }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [liked, setLiked] = useState(() => new Set());
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState('');
  const [reporting, setReporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const list = await api.listComments(experienceId);
        if (alive) setComments(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [experienceId]);

  const likeCount = (c) => (c.likeCount ?? c.likes ?? 0) + (liked.has(c.id) ? 1 : 0);
  const isOwn = (c) => Boolean(user) && c.authorId === user.id;

  const toggleLike = (id) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (parentId, text, reset) => {
    const trimmed = text.trim();
    if (!trimmed || !user || submitting) return;
    setSubmitting(true);
    try {
      let saved = null;
      if (typeof api.addComment === 'function') {
        saved = await api.addComment(experienceId, { body: trimmed, parentId: parentId || null });
      }
      if (!saved) {
        saved = {
          id: `c-${Date.now()}`,
          authorId: user.id,
          authorName: user.name || 'You',
          createdAt: new Date().toISOString(),
          body: trimmed,
          likeCount: 0,
          replies: [],
        };
      }
      if (parentId) {
        setComments((cs) => cs.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), saved] } : c
        ));
      } else {
        setComments((cs) => [saved, ...cs]);
      }
      reset();
      toast.success('Comment posted.');
    } catch {
      toast.error('Could not post your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportTarget || reporting) return;
    setReporting(true);
    try {
      const reason = reportDetail.trim()
        ? `${reportReason} — ${reportDetail.trim()}`
        : reportReason;
      await api.reportContent('comment', reportTarget.id, reason);
      toast.success('Thanks. Our team will review this comment.');
      setReportTarget(null);
      setReportReason(REPORT_REASONS[0]);
      setReportDetail('');
    } catch {
      toast.error('Could not submit the report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (typeof api.deleteComment === 'function') {
        await api.deleteComment(deleteTarget.id);
      }
      setComments((cs) =>
        cs
          .filter((c) => c.id !== deleteTarget.id)
          .map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== deleteTarget.id) }))
      );
      toast.success('Comment deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Could not delete the comment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const renderComment = (c, isReply = false) => (
    <article key={c.id} className={isReply ? 'ct-comment ct-reply' : 'ct-comment'}>
      <Avatar name={c.authorName || 'Anonymous'} size={36} />
      <div className="ct-comment-body">
        <div className="ct-comment-head">
          <span className="ct-author">{c.authorName || 'Anonymous'}</span>
          <span className="ct-time" title={c.createdAt}>{timeAgo(c.createdAt)}</span>
        </div>
        <p className="ct-text">{c.body}</p>
        <div className="ct-actions">
          <button
            type="button"
            className={`ct-action${liked.has(c.id) ? ' is-active' : ''}`}
            onClick={() => toggleLike(c.id)}
            aria-pressed={liked.has(c.id)}
            aria-label={liked.has(c.id) ? 'Unlike this comment' : 'Like this comment'}
          >
            <Icon name="heart" />
            <span>{likeCount(c)}</span>
          </button>
          {user && !isReply && (
            <button
              type="button"
              className="ct-action"
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(''); }}
              aria-expanded={replyTo === c.id}
            >
              <Icon name="message" />
              <span>Reply</span>
            </button>
          )}
          {user && (
            <button
              type="button"
              className="ct-action"
              onClick={() => setReportTarget(c)}
            >
              <Icon name="flag" />
              <span>Report</span>
            </button>
          )}
          {isOwn(c) && (
            <button
              type="button"
              className="ct-action ct-danger"
              onClick={() => setDeleteTarget(c)}
            >
              <Icon name="trash" />
              <span>Delete</span>
            </button>
          )}
        </div>
        {user && replyTo === c.id && !isReply && (
          <form
            className="ct-reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd(c.id, replyBody, () => { setReplyBody(''); setReplyTo(null); });
            }}
          >
            <label className="ct-sr" htmlFor={`reply-${c.id}`}>Write a reply</label>
            <textarea
              id={`reply-${c.id}`}
              className="ct-input"
              rows={2}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={`Reply to ${c.authorName || 'this comment'}...`}
              disabled={submitting}
              autoFocus
            />
            <div className="ct-form-row">
              <button type="button" className="ct-btn ct-btn-ghost" onClick={() => setReplyTo(null)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="ct-btn ct-btn-primary" disabled={submitting || !replyBody.trim()}>
                {submitting ? 'Posting...' : 'Post reply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );

  return (
    <section className="comment-thread" aria-label="Comments">
      <h2 className="ct-heading">
        <Icon name="message" />
        Comments
        <span className="ct-count">{comments.length}</span>
      </h2>

      {user ? (
        <form
          className="ct-composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd(null, body, () => setBody(''));
          }}
        >
          <Avatar name={user.name || 'You'} size={36} />
          <div className="ct-composer-main">
            <label className="ct-sr" htmlFor="ct-new-comment">Add a comment</label>
            <textarea
              id="ct-new-comment"
              className="ct-input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a thoughtful question or share a relevant insight..."
              disabled={submitting}
            />
            <div className="ct-form-row">
              <button type="submit" className="ct-btn ct-btn-primary" disabled={submitting || !body.trim()}>
                {submitting ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="ct-login-prompt">
          <Icon name="lock" />
          <p>
            <Link to="/login">Log in</Link> to join the discussion and ask the author a question.
          </p>
        </div>
      )}

      <div className="ct-list">
        {loading && <p className="ct-status">Loading comments...</p>}
        {!loading && loadError && (
          <p className="ct-status ct-error" role="alert">
            Could not load comments. Please refresh the page.
          </p>
        )}
        {!loading && !loadError && comments.length === 0 && (
          <EmptyState
            title="No comments yet."
            body="Be the first to share a thoughtful question."
          />
        )}
        {!loading && !loadError && comments.map((c) => (
          <div key={c.id} className="ct-thread">
            {renderComment(c)}
            {(c.replies || []).length > 0 && (
              <div className="ct-replies">
                {c.replies.map((r) => renderComment(r, true))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        title="Report comment"
      >
        <div className="ct-modal-field">
          <label htmlFor="ct-report-reason">Reason</label>
          <select
            id="ct-report-reason"
            className="ct-input"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            disabled={reporting}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="ct-modal-field">
          <label htmlFor="ct-report-detail">Details (optional)</label>
          <textarea
            id="ct-report-detail"
            className="ct-input"
            rows={3}
            value={reportDetail}
            onChange={(e) => setReportDetail(e.target.value)}
            placeholder="Add any context that helps our review..."
            disabled={reporting}
          />
        </div>
        <div className="ct-form-row ct-modal-actions">
          <button type="button" className="ct-btn ct-btn-ghost" onClick={() => setReportTarget(null)} disabled={reporting}>
            Cancel
          </button>
          <button type="button" className="ct-btn ct-btn-primary" onClick={handleReport} disabled={reporting}>
            {reporting ? 'Submitting...' : 'Submit report'}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete comment"
      >
        <p className="ct-modal-text">
          Are you sure you want to delete this comment? This cannot be undone.
        </p>
        <div className="ct-form-row ct-modal-actions">
          <button type="button" className="ct-btn ct-btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="ct-btn ct-btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </section>
  );
}
