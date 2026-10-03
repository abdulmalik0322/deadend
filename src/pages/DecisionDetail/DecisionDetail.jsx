import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import ProgressBar from '../../components/ProgressBar/ProgressBar.jsx';
import BeforeAfterCompare from '../../components/BeforeAfterCompare/BeforeAfterCompare.jsx';
import SimilarityCard from '../../components/SimilarityCard/SimilarityCard.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import { SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, timeAgo } from '../../utils/format.js';
import './DecisionDetail.css';

const STATUS_META = {
  planning: { label: 'Planning', className: 'st-planning' },
  active: { label: 'Active', className: 'st-active' },
  completed: { label: 'Completed', className: 'st-completed' },
  abandoned: { label: 'Abandoned', className: 'st-abandoned' },
};

const TIMELINE_STAGES = [
  'Decision Created',
  'Research',
  'Started',
  '30 Days',
  '90 Days',
  '6 Months',
  'Final Outcome',
];

const FIELD_CLASS = 'dd-input';

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const [modal, setModal] = useState(null); // 'progress' | 'expectations' | 'update' | 'outcome' | 'abandon' | 'delete'
  const [activeStage, setActiveStage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal form fields
  const [progressValue, setProgressValue] = useState(0);
  const [expForm, setExpForm] = useState({ duration: '', investment: '', expectedResult: '', goal: '' });
  const [updateText, setUpdateText] = useState('');
  const [outcomeForm, setOutcomeForm] = useState({ duration: '', investment: '', result: '' });
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDue, setMilestoneDue] = useState('');
  const [milestoneBusy, setMilestoneBusy] = useState(false);

  useDocumentTitle(decision ? `${decision.title} | DEADEND` : 'Decision | DEADEND');

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const d = await api.getDecision(id);
      if (!d) {
        setNotFound(true);
      } else {
        setDecision(d);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!decision) return;
    let alive = true;
    (async () => {
      setSimilarLoading(true);
      try {
        const res = await api.findSimilar({
          situation: decision.situation || {},
          goal: decision.expectations?.goal || '',
        });
        if (alive) setSimilar(Array.isArray(res?.results) ? res.results : []);
      } catch {
        if (alive) setSimilar([]);
      } finally {
        if (alive) setSimilarLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [decision]);

  const status = decision ? STATUS_META[decision.status] || STATUS_META.planning : null;
  const progress = decision ? Math.max(0, Math.min(100, Number(decision.progress) || 0)) : 0;
  const milestones = decision?.milestones || [];
  const updates = useMemo(() => {
    const u = [...(decision?.updates || [])];
    u.sort((a, b) => new Date(b.date) - new Date(a.date));
    return u;
  }, [decision]);

  const daysElapsed = decision
    ? Math.max(0, Math.floor((Date.now() - new Date(decision.createdAt).getTime()) / 86400000))
    : 0;

  const timelineByStage = useMemo(() => {
    const map = {};
    (decision?.timeline || []).forEach((t) => {
      if (t.stage && !map[t.stage]) map[t.stage] = t;
    });
    return map;
  }, [decision]);

  const isTerminal = decision?.status === 'completed' || decision?.status === 'abandoned';

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setModalError('');
    setActiveStage(null);
  };

  const openProgress = () => {
    setProgressValue(progress);
    setModal('progress');
  };

  const openExpectations = () => {
    const ex = decision.expectations || {};
    setExpForm({
      duration: ex.duration || '',
      investment: ex.investment || '',
      expectedResult: ex.expectedResult || '',
      goal: ex.goal || '',
    });
    setModal('expectations');
  };

  const openUpdate = (stage) => {
    setActiveStage(stage);
    setUpdateText('');
    setModal('update');
  };

  const openOutcome = () => {
    setOutcomeForm({ duration: '', investment: '', result: '' });
    setModal('outcome');
  };

  const saveProgress = async () => {
    const v = Math.max(0, Math.min(100, Number(progressValue) || 0));
    setBusy(true);
    setModalError('');
    try {
      await api.updateDecision(id, { progress: v });
      setDecision((d) => ({ ...d, progress: v }));
      toast.success('Progress updated.');
      closeModal();
    } catch {
      setModalError('Could not update progress. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveExpectations = async () => {
    if (!expForm.duration.trim() || !expForm.investment.trim() || !expForm.expectedResult.trim() || !expForm.goal.trim()) {
      setModalError('All expectation fields are required.');
      return;
    }
    setBusy(true);
    setModalError('');
    try {
      const expectations = {
        duration: expForm.duration.trim(),
        investment: expForm.investment.trim(),
        expectedResult: expForm.expectedResult.trim(),
        goal: expForm.goal.trim(),
      };
      await api.updateDecision(id, { expectations });
      setDecision((d) => ({ ...d, expectations }));
      toast.success('Expectations updated.');
      closeModal();
    } catch {
      setModalError('Could not update expectations. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveUpdate = async () => {
    if (!updateText.trim()) {
      setModalError('Write a short update before saving.');
      return;
    }
    setBusy(true);
    setModalError('');
    try {
      await api.addDecisionUpdate(id, { text: updateText.trim(), stage: activeStage });
      toast.success('Update added.');
      closeModal();
      await load();
    } catch {
      setModalError('Could not add the update. Please try again.');
      setBusy(false);
    }
  };

  const saveOutcome = async () => {
    if (!outcomeForm.duration.trim() || !outcomeForm.investment.trim() || !outcomeForm.result.trim()) {
      setModalError('Actual duration, investment, and result are all required.');
      return;
    }
    setBusy(true);
    setModalError('');
    try {
      const actual = {
        duration: outcomeForm.duration.trim(),
        investment: outcomeForm.investment.trim(),
        result: outcomeForm.result.trim(),
      };
      await api.completeDecision(id, actual);
      toast.success('Outcome recorded. Decision completed.');
      closeModal();
      await load();
    } catch {
      setModalError('Could not record the outcome. Please try again.');
      setBusy(false);
    }
  };

  const confirmAbandon = async () => {
    setBusy(true);
    setModalError('');
    try {
      await api.abandonDecision(id);
      toast.success('Decision marked as abandoned.');
      closeModal();
      await load();
    } catch {
      setModalError('Could not abandon the decision. Please try again.');
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setModalError('');
    try {
      await api.deleteDecision(id);
      toast.success('Decision deleted.');
      navigate('/decisions');
    } catch {
      setModalError('Could not delete the decision. Please try again.');
      setBusy(false);
    }
  };

  const addMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || milestoneBusy) return;
    setMilestoneBusy(true);
    try {
      await api.addMilestone(id, {
        title: milestoneTitle.trim(),
        dueDate: milestoneDue || null,
      });
      setMilestoneTitle('');
      setMilestoneDue('');
      toast.success('Milestone added.');
      await load();
    } catch {
      toast.error('Could not add the milestone. Please try again.');
    } finally {
      setMilestoneBusy(false);
    }
  };

  const toggleMilestone = async (m) => {
    try {
      await api.toggleMilestone(id, m.id);
      setDecision((d) => ({
        ...d,
        milestones: (d.milestones || []).map((x) =>
          x.id === m.id ? { ...x, done: !x.done } : x
        ),
      }));
    } catch {
      toast.error('Could not update the milestone. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="dd-page">
        <div className="dd-container">
          <SkeletonText lines={8} />
        </div>
      </div>
    );
  }

  if (notFound || !decision) {
    return (
      <div className="dd-page">
        <div className="dd-container">
          <ErrorState
            title="Decision not found"
            body="This decision does not exist or you do not have access to it."
          />
          <div className="dd-notfound-actions">
            <Link to="/decisions" className="dd-btn dd-btn-primary">Back to decisions</Link>
          </div>
        </div>
      </div>
    );
  }

  const modalActions = (primaryLabel, onPrimary, danger = false) => (
    <>
      {modalError && <p className="dd-modal-error" role="alert">{modalError}</p>}
      <div className="dd-form-row dd-modal-actions">
        <button type="button" className="dd-btn dd-btn-ghost" onClick={closeModal} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`dd-btn ${danger ? 'dd-btn-danger' : 'dd-btn-primary'}`}
          onClick={onPrimary}
          disabled={busy}
        >
          {busy ? 'Please wait...' : primaryLabel}
        </button>
      </div>
    </>
  );

  return (
    <div className="dd-page">
      <div className="dd-container">
        <Link to="/decisions" className="dd-back">
          <Icon name="arrowLeft" /> All decisions
        </Link>

        <header className="dd-header">
          <div className="dd-header-top">
            <span className="dd-id-chip">{decision.id}</span>
            <span className={`dd-status ${status.className}`}>{status.label}</span>
          </div>
          <h1 className="dd-title">{decision.title}</h1>
          <p className="dd-created">
            <Icon name="calendar" />
            Created {formatDate(decision.createdAt)}
          </p>
          <div className="dd-header-actions">
            {!isTerminal && (
              <button type="button" className="dd-btn dd-btn-ghost" onClick={openExpectations}>
                <Icon name="edit" /> Edit expectations
              </button>
            )}
            {!isTerminal && (
              <button type="button" className="dd-btn dd-btn-ghost" onClick={() => setModal('abandon')}>
                <Icon name="flag" /> Abandon
              </button>
            )}
            <button type="button" className="dd-btn dd-btn-danger-ghost" onClick={() => setModal('delete')}>
              <Icon name="trash" /> Delete
            </button>
          </div>
        </header>

        <section className="dd-progress-section" aria-label="Progress">
          <div className="dd-progress-row">
            <ProgressBar value={progress} />
            <span className="dd-progress-label">{progress}%</span>
          </div>
          {!isTerminal && (
            <button type="button" className="dd-link-btn" onClick={openProgress}>
              Update progress
            </button>
          )}
        </section>

        <section className="dd-stats" aria-label="Key figures">
          <div className="dd-stat">
            <span className="dd-stat-label">Expected duration</span>
            <span className="dd-stat-value">{decision.expectations?.duration || '—'}</span>
          </div>
          <div className="dd-stat">
            <span className="dd-stat-label">Expected investment</span>
            <span className="dd-stat-value">{decision.expectations?.investment || '—'}</span>
          </div>
          <div className="dd-stat">
            <span className="dd-stat-label">Expected result</span>
            <span className="dd-stat-value">{decision.expectations?.expectedResult || '—'}</span>
          </div>
          <div className="dd-stat">
            <span className="dd-stat-label">Days elapsed</span>
            <span className="dd-stat-value">{daysElapsed}</span>
          </div>
        </section>

        <section className="dd-section" aria-label="Decision timeline">
          <h2 className="dd-section-title">Decision Timeline</h2>
          <ol className="dd-timeline">
            {TIMELINE_STAGES.map((stageName) => {
              const entry = timelineByStage[stageName];
              const done = Boolean(entry?.done);
              return (
                <li key={stageName} className={`dd-timeline-item${done ? ' is-done' : ''}`}>
                  <span className="dd-timeline-dot" aria-hidden="true">
                    {done && <Icon name="check" />}
                  </span>
                  <div className="dd-timeline-content">
                    <div className="dd-timeline-head">
                      <h3>{stageName}</h3>
                      {entry?.date && <span className="dd-timeline-date">{formatDate(entry.date)}</span>}
                    </div>
                    {entry?.note && <p className="dd-timeline-note">{entry.note}</p>}
                    {!isTerminal && (
                      <button type="button" className="dd-link-btn" onClick={() => openUpdate(stageName)}>
                        <Icon name="plus" /> Add update
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="dd-section" aria-label="Milestones">
          <h2 className="dd-section-title">Milestones</h2>
          {milestones.length === 0 && !isTerminal ? (
            <p className="dd-muted">No milestones yet. Break this decision into concrete checkpoints.</p>
          ) : null}
          <ul className="dd-milestones">
            {milestones.map((m) => (
              <li key={m.id} className={`dd-milestone${m.done ? ' is-done' : ''}`}>
                <button
                  type="button"
                  className="dd-milestone-check"
                  onClick={() => toggleMilestone(m)}
                  aria-pressed={m.done}
                  aria-label={m.done ? `Mark "${m.title}" as not done` : `Mark "${m.title}" as done`}
                  disabled={isTerminal}
                >
                  {m.done && <Icon name="check" />}
                </button>
                <span className="dd-milestone-title">{m.title}</span>
                {m.dueDate && <span className="dd-milestone-due">{formatDate(m.dueDate)}</span>}
              </li>
            ))}
          </ul>
          {!isTerminal && (
            <form className="dd-milestone-form" onSubmit={addMilestone}>
              <label className="dd-sr" htmlFor="dd-milestone-title">New milestone title</label>
              <input
                id="dd-milestone-title"
                type="text"
                className={FIELD_CLASS}
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. First 10 paying customers"
                disabled={milestoneBusy}
              />
              <label className="dd-sr" htmlFor="dd-milestone-due">Due date (optional)</label>
              <input
                id="dd-milestone-due"
                type="date"
                className={FIELD_CLASS}
                value={milestoneDue}
                onChange={(e) => setMilestoneDue(e.target.value)}
                disabled={milestoneBusy}
              />
              <button type="submit" className="dd-btn dd-btn-ghost" disabled={milestoneBusy || !milestoneTitle.trim()}>
                <Icon name="plus" /> Add
              </button>
            </form>
          )}
        </section>

        <section className="dd-section" aria-label="Updates">
          <h2 className="dd-section-title">Updates</h2>
          {updates.length === 0 ? (
            <p className="dd-muted">No updates logged yet.</p>
          ) : (
            <ul className="dd-updates">
              {updates.map((u) => (
                <li key={u.id} className="dd-update">
                  <div className="dd-update-head">
                    {u.stage && <span className="dd-update-stage">{u.stage}</span>}
                    <span className="dd-update-date" title={u.date}>{timeAgo(u.date)}</span>
                  </div>
                  <p className="dd-update-text">{u.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dd-section" aria-label="Before versus after">
          <h2 className="dd-section-title">Before vs After</h2>
          {decision.actual ? (
            <BeforeAfterCompare
              before={{
                duration: decision.expectations?.duration,
                investment: decision.expectations?.investment,
                result: decision.expectations?.expectedResult,
              }}
              after={decision.actual}
              labels={{ before: 'Expected', after: 'Actual' }}
            />
          ) : (
            <div className="dd-outcome-cta">
              <p className="dd-muted">
                {decision.status === 'completed'
                  ? 'This decision is marked complete.'
                  : 'When the dust settles, record what actually happened and compare it against your expectations.'}
              </p>
              {!isTerminal && (
                <button type="button" className="dd-btn dd-btn-primary" onClick={openOutcome}>
                  <Icon name="target" /> Record outcome
                </button>
              )}
            </div>
          )}
        </section>

        <section className="dd-section" aria-label="Similar experiences">
          <h2 className="dd-section-title">Similar experiences</h2>
          {similarLoading && <SkeletonText lines={3} />}
          {!similarLoading && similar.length === 0 && (
            <EmptyState
              title="No similar experiences yet."
              body="As more people share, relevant stories will appear here."
            />
          )}
          {!similarLoading && similar.length > 0 && (
            <div className="dd-similar-grid">
              {similar.map((s, i) => (
                <SimilarityCard
                  key={s.experience?.id || i}
                  experience={s.experience}
                  score={s.score}
                  factors={s.factors}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={modal === 'progress'} onClose={closeModal} title="Update progress">
        <div className="dd-modal-field">
          <label htmlFor="dd-progress-input">Progress (%)</label>
          <input
            id="dd-progress-input"
            type="number"
            min={0}
            max={100}
            className={FIELD_CLASS}
            value={progressValue}
            onChange={(e) => setProgressValue(e.target.value)}
            disabled={busy}
          />
        </div>
        {modalActions('Save progress', saveProgress)}
      </Modal>

      <Modal open={modal === 'expectations'} onClose={closeModal} title="Edit expectations">
        <div className="dd-modal-field">
          <label htmlFor="dd-exp-duration">Expected duration</label>
          <input id="dd-exp-duration" type="text" className={FIELD_CLASS}
            value={expForm.duration} onChange={(e) => setExpForm({ ...expForm, duration: e.target.value })} disabled={busy} />
        </div>
        <div className="dd-modal-field">
          <label htmlFor="dd-exp-investment">Expected investment</label>
          <input id="dd-exp-investment" type="text" className={FIELD_CLASS}
            value={expForm.investment} onChange={(e) => setExpForm({ ...expForm, investment: e.target.value })} disabled={busy} />
        </div>
        <div className="dd-modal-field">
          <label htmlFor="dd-exp-result">Expected result</label>
          <textarea id="dd-exp-result" rows={3} className={FIELD_CLASS}
            value={expForm.expectedResult} onChange={(e) => setExpForm({ ...expForm, expectedResult: e.target.value })} disabled={busy} />
        </div>
        <div className="dd-modal-field">
          <label htmlFor="dd-exp-goal">Main goal</label>
          <textarea id="dd-exp-goal" rows={3} className={FIELD_CLASS}
            value={expForm.goal} onChange={(e) => setExpForm({ ...expForm, goal: e.target.value })} disabled={busy} />
        </div>
        {modalActions('Save expectations', saveExpectations)}
      </Modal>

      <Modal open={modal === 'update'} onClose={closeModal} title={activeStage ? `Add update — ${activeStage}` : 'Add update'}>
        <div className="dd-modal-field">
          <label htmlFor="dd-update-text">What happened?</label>
          <textarea
            id="dd-update-text"
            rows={4}
            className={FIELD_CLASS}
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder="Log what changed, what you learned, or what you did next..."
            disabled={busy}
          />
        </div>
        {modalActions('Add update', saveUpdate)}
      </Modal>

      <Modal open={modal === 'outcome'} onClose={closeModal} title="Record outcome">
        <p className="dd-modal-text">
          Be honest — the real numbers are what make this decision useful to your future self and others.
        </p>
        <div className="dd-modal-field">
          <label htmlFor="dd-out-duration">Actual duration</label>
          <input id="dd-out-duration" type="text" className={FIELD_CLASS}
            value={outcomeForm.duration} onChange={(e) => setOutcomeForm({ ...outcomeForm, duration: e.target.value })}
            placeholder="e.g. 7 months" disabled={busy} />
        </div>
        <div className="dd-modal-field">
          <label htmlFor="dd-out-investment">Actual investment</label>
          <input id="dd-out-investment" type="text" className={FIELD_CLASS}
            value={outcomeForm.investment} onChange={(e) => setOutcomeForm({ ...outcomeForm, investment: e.target.value })}
            placeholder="e.g. PKR 180,000" disabled={busy} />
        </div>
        <div className="dd-modal-field">
          <label htmlFor="dd-out-result">Actual result</label>
          <textarea id="dd-out-result" rows={4} className={FIELD_CLASS}
            value={outcomeForm.result} onChange={(e) => setOutcomeForm({ ...outcomeForm, result: e.target.value })}
            placeholder="What actually happened?" disabled={busy} />
        </div>
        {modalActions('Complete decision', saveOutcome)}
      </Modal>

      <Modal open={modal === 'abandon'} onClose={closeModal} title="Abandon decision">
        <p className="dd-modal-text">
          Marking this decision as abandoned keeps the record honest — including the attempts that did not
          work out is exactly what DEADEND is for.
        </p>
        {modalActions('Abandon decision', confirmAbandon, true)}
      </Modal>

      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete decision">
        <p className="dd-modal-text">
          Are you sure you want to delete this decision and all of its milestones and updates?
          This cannot be undone.
        </p>
        {modalActions('Delete permanently', confirmDelete, true)}
      </Modal>
    </div>
  );
}
