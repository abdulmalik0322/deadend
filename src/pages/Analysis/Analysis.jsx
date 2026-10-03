import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import TagList from '../../components/TagList/TagList.jsx';
import ProgressBar from '../../components/ProgressBar/ProgressBar.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import { formatDate } from '../../utils/format.js';
import './Analysis.css';

const BUDGET_OPTIONS = [
  'Under $1,000',
  '$1,000 – $5,000',
  '$5,000 – $20,000',
  'Over $20,000',
  'No fixed budget',
];

const EXPERIENCE_OPTIONS = [
  'Beginner — starting from zero',
  'Some experience — tried this before',
  'Experienced — done this before',
];

const TIME_OPTIONS = [
  'Under 5 hours per week',
  '5–10 hours per week',
  '10–20 hours per week',
  'Full-time',
];

const emptyReportForm = {
  title: '',
  goal: '',
  country: '',
  budget: '',
  experienceLevel: '',
  timeAvailable: '',
  skills: '',
};

function ListEditor({ items, onChange, placeholder }) {
  const update = (idx, value) => {
    const next = items.slice();
    next[idx] = value;
    onChange(next);
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, '']);

  return (
    <div className="list-editor">
      {items.map((item, idx) => (
        <div key={idx} className="list-editor-row">
          <input
            className="input"
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(idx, e.target.value)}
          />
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => remove(idx)}
            aria-label="Remove item"
          >
            <Icon name="x" />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
        <Icon name="plus" /> Add
      </button>
    </div>
  );
}

export default function Analysis() {
  useDocumentTitle('Decision Analysis · DEADEND');
  const revealRef = useReveal();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('report');

  // ---- Decision Report state ----
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [report, setReport] = useState(null);

  // ---- Structure My Story state ----
  const [rawStory, setRawStory] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [continuing, setContinuing] = useState(false);

  const setReportField = (key) => (e) =>
    setReportForm((f) => ({ ...f, [key]: e.target.value }));

  const handleReportSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!reportForm.title.trim() || !reportForm.goal.trim()) {
      toast.error('Please add a decision title and your goal.');
      return;
    }
    setReportLoading(true);
    setReportError(null);
    setReport(null);
    try {
      const data = await api.aiAnalyzeDecision({
        title: reportForm.title.trim(),
        goal: reportForm.goal.trim(),
        country: reportForm.country.trim(),
        budget: reportForm.budget,
        experienceLevel: reportForm.experienceLevel,
        timeAvailable: reportForm.timeAvailable,
        skills: reportForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setReport(data);
    } catch (err) {
      setReportError(err?.message || 'The analysis could not be generated. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleStructure = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!rawStory.trim()) {
      toast.error('Paste your story first.');
      return;
    }
    setStoryLoading(true);
    setStoryError(null);
    setDraft(null);
    try {
      const data = await api.structureStory(rawStory.trim());
      setDraft(data);
      toast.success('Draft structured. Review it before publishing.');
    } catch (err) {
      setStoryError(err?.message || 'The story could not be structured. Please try again.');
    } finally {
      setStoryLoading(false);
    }
  };

  const updateDraft = (key) => (value) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const updateStartingPoint = (key) => (e) =>
    setDraft((d) =>
      d ? { ...d, startingPoint: { ...d.startingPoint, [key]: e.target.value } } : d
    );

  const handleContinueToShare = async () => {
    if (!draft) return;
    setContinuing(true);
    try {
      const sp = draft.startingPoint || {};
      await api.saveDraft('share', {
        goal: draft.goal || '',
        education: sp.education || '',
        experienceLevel: sp.experienceLevel || '',
        budget: sp.budget || '',
        timeAvailable: sp.timeAvailable || '',
        location: sp.location || '',
        skills: Array.isArray(sp.skills) ? sp.skills : [],
        actions: draft.actions || [],
        duration: draft.duration || '',
        investment: draft.investment || '',
        outcome: draft.outcome || '',
        obstacles: draft.obstacles || [],
        lessons: draft.lessons || [],
      });
      toast.success('Draft saved. Continue in the Share form.');
      navigate('/share');
    } catch (err) {
      toast.error(err?.message || 'Could not save the draft. Please try again.');
    } finally {
      setContinuing(false);
    }
  };

  const reportInputRows = report
    ? [
        { label: 'Decision', value: reportForm.title },
        { label: 'Goal', value: reportForm.goal },
        { label: 'Country', value: reportForm.country || '—' },
        { label: 'Budget', value: reportForm.budget || '—' },
        { label: 'Experience', value: reportForm.experienceLevel || '—' },
        { label: 'Time available', value: reportForm.timeAvailable || '—' },
      ]
    : [];

  const maxObstacle = report?.obstacles?.length
    ? Math.max(...report.obstacles.map((o) => o.count || 0), 1)
    : 1;

  return (
    <div ref={revealRef} className="page analysis-page">
      <header className="page-head">
        <h1 className="page-title">Decision Analysis</h1>
        <p className="page-sub">
          Two intelligence tools: generate an honest report on a decision you are
          considering, or turn a messy story into a structured, publishable draft.
        </p>
      </header>

      <div className="tabs" role="tablist" aria-label="Analysis tools">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'report'}
          className={`tab ${tab === 'report' ? 'active' : ''}`}
          onClick={() => setTab('report')}
        >
          <Icon name="chart" /> Decision Report
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'story'}
          className={`tab ${tab === 'story' ? 'active' : ''}`}
          onClick={() => setTab('story')}
        >
          <Icon name="doc" /> Structure My Story
        </button>
      </div>

      {tab === 'report' && (
        <div className="tab-panel">
          <section className="card" aria-label="Decision report input">
            <form onSubmit={handleReportSubmit}>
              <div className="form-grid">
                <div className="field full">
                  <label className="label" htmlFor="analysis-title">Decision title</label>
                  <input
                    id="analysis-title"
                    className="input"
                    type="text"
                    placeholder="e.g. Should I quit my job to freelance full-time?"
                    value={reportForm.title}
                    onChange={setReportField('title')}
                  />
                </div>
                <div className="field full">
                  <label className="label" htmlFor="analysis-goal">Goal</label>
                  <input
                    id="analysis-goal"
                    className="input"
                    type="text"
                    placeholder="e.g. Earn $2,000/month from freelance clients"
                    value={reportForm.goal}
                    onChange={setReportField('goal')}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="analysis-country">Country</label>
                  <input
                    id="analysis-country"
                    className="input"
                    type="text"
                    placeholder="e.g. Pakistan"
                    value={reportForm.country}
                    onChange={setReportField('country')}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="analysis-budget">Budget</label>
                  <select id="analysis-budget" className="select" value={reportForm.budget} onChange={setReportField('budget')}>
                    <option value="">Select a range</option>
                    {BUDGET_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="analysis-experience">Experience</label>
                  <select id="analysis-experience" className="select" value={reportForm.experienceLevel} onChange={setReportField('experienceLevel')}>
                    <option value="">Select your level</option>
                    {EXPERIENCE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="analysis-time">Time available</label>
                  <select id="analysis-time" className="select" value={reportForm.timeAvailable} onChange={setReportField('timeAvailable')}>
                    <option value="">Select availability</option>
                    {TIME_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="field full">
                  <label className="label" htmlFor="analysis-skills">Skills</label>
                  <input
                    id="analysis-skills"
                    className="input"
                    type="text"
                    placeholder="Comma separated — e.g. design, client communication"
                    value={reportForm.skills}
                    onChange={setReportField('skills')}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={reportLoading}>
                  <Icon name="sparkles" />
                  {reportLoading ? 'Analyzing…' : 'Generate report'}
                </button>
              </div>
            </form>
          </section>

          <div className="report-zone" aria-live="polite">
            {reportLoading && (
              <div className="report-skeletons">
                <SkeletonCard />
                <SkeletonText lines={4} />
                <SkeletonCard />
              </div>
            )}

            {!reportLoading && reportError && (
              <ErrorState
                title="Analysis failed"
                body={reportError}
                onRetry={handleReportSubmit}
              />
            )}

            {!reportLoading && !reportError && !report && (
              <EmptyState
                icon="chart"
                title="No report yet"
                body="Fill in the decision above and generate a report. It combines dataset statistics with an AI-written summary — informational only, never a prediction."
              />
            )}

            {!reportLoading && !reportError && report && (
              <article className="report">
                <header className="report-head">
                  <p className="section-label">Decision Analysis</p>
                  <h2 className="report-title">{reportForm.title}</h2>
                </header>

                <section className="report-section card">
                  <h3 className="section-label"><Icon name="user" /> Your input</h3>
                  <dl className="input-echo">
                    {reportInputRows.map((row) => (
                      <div key={row.label} className="input-echo-row">
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {reportForm.skills.split(',').map((s) => s.trim()).filter(Boolean).length > 0 && (
                    <TagList tags={reportForm.skills.split(',').map((s) => s.trim()).filter(Boolean)} />
                  )}
                </section>

                <section className="report-section card">
                  <h3 className="section-label"><Icon name="chart" /> Dataset statistics</h3>
                  <p className="stat-lead">
                    Among the available experiences,{' '}
                    <strong>{report.relevantCount ?? 0}</strong>{' '}
                    {(report.relevantCount ?? 0) === 1 ? 'was' : 'were'} relevant to this decision.
                  </p>

                  {report.obstacles?.length > 0 && (
                    <div className="stat-block">
                      <h4 className="stat-block-title">Common obstacles</h4>
                      <ul className="obstacle-list">
                        {report.obstacles.map((o, i) => (
                          <li key={i} className="obstacle-row">
                            <div className="obstacle-meta">
                              <span className="obstacle-text">{o.text}</span>
                              <span className="obstacle-count">{o.count} mentions</span>
                            </div>
                            <ProgressBar value={Math.round(((o.count || 0) / maxObstacle) * 100)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.patterns?.length > 0 && (
                    <div className="stat-block">
                      <h4 className="stat-block-title">Recurring patterns</h4>
                      <div className="pattern-grid">
                        {report.patterns.map((p, i) => (
                          <div key={i} className="pattern-card">
                            <h5>{p.title}</h5>
                            <p>{p.detail}</p>
                            <span className="pattern-records">
                              Appears in {p.records} of {report.relevantCount ?? 0} available records
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="report-section card">
                  <h3 className="section-label"><Icon name="sparkles" /> AI-generated summary</h3>
                  <p className="ai-summary">{report.summary}</p>

                  {report.questions?.length > 0 && (
                    <div className="stat-block">
                      <h4 className="stat-block-title">Questions worth investigating</h4>
                      <ul className="questions-list">
                        {report.questions.map((q, i) => (
                          <li key={i}>
                            <Icon name="arrowRight" />
                            <span>{typeof q === 'string' ? q : q.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {report.relatedExperiences?.length > 0 && (
                  <section className="report-section card">
                    <h3 className="section-label"><Icon name="doc" /> Related experiences</h3>
                    <ul className="related-list">
                      {report.relatedExperiences.map((exp, i) => (
                        <li key={exp.id ?? i}>
                          <Link className="related-link" to={`/experiences/${exp.slug || exp.id}`}>
                            <span className="related-title">{exp.title}</span>
                            <span className="related-meta">
                              {exp.goal ? `${exp.goal} · ` : ''}
                              {exp.createdAt ? formatDate(exp.createdAt) : ''}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className="analysis-note">
                  This analysis is informational, drawn from platform data — it does
                  not predict outcomes.
                </p>
              </article>
            )}
          </div>
        </div>
      )}

      {tab === 'story' && (
        <div className="tab-panel">
          <section className="card" aria-label="Paste your story">
            <form onSubmit={handleStructure}>
              <div className="field">
                <label className="label" htmlFor="story-raw">
                  Paste your messy story
                </label>
                <textarea
                  id="story-raw"
                  className="textarea"
                  placeholder="Write it however it comes to mind — what you wanted, where you started, what you tried, what happened. The AI will structure it into a clean draft you can review."
                  value={rawStory}
                  onChange={(e) => setRawStory(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={storyLoading}>
                  <Icon name="layers" />
                  {storyLoading ? 'Structuring…' : 'Structure my story'}
                </button>
              </div>
            </form>
          </section>

          <div className="story-zone" aria-live="polite">
            {storyLoading && (
              <div className="report-skeletons">
                <SkeletonCard />
                <SkeletonText lines={5} />
              </div>
            )}

            {!storyLoading && storyError && (
              <ErrorState
                title="Structuring failed"
                body={storyError}
                onRetry={handleStructure}
              />
            )}

            {!storyLoading && !storyError && !draft && (
              <EmptyState
                icon="doc"
                title="No draft yet"
                body="Paste your story above and the AI will organize it into goal, starting point, actions, outcome, obstacles and lessons — ready for you to review and edit."
              />
            )}

            {!storyLoading && !storyError && draft && (
              <section className="card draft-card" aria-label="Structured draft preview">
                <div className="draft-badge">
                  <Icon name="sparkles" />
                  <span>AI-generated draft — review before publishing</span>
                </div>

                <div className="draft-grid">
                  <div className="field full">
                    <label className="label">Goal</label>
                    <input
                      className="input"
                      type="text"
                      value={draft.goal || ''}
                      onChange={(e) => updateDraft('goal')(e.target.value)}
                    />
                  </div>

                  <div className="draft-subhead full">
                    <h4 className="section-label"><Icon name="user" /> Starting point</h4>
                  </div>
                  {['education', 'experienceLevel', 'budget', 'timeAvailable', 'location'].map((key) => (
                    <div className="field" key={key}>
                      <label className="label">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                      </label>
                      <input
                        className="input"
                        type="text"
                        value={draft.startingPoint?.[key] || ''}
                        onChange={updateStartingPoint(key)}
                      />
                    </div>
                  ))}
                  <div className="field">
                    <label className="label">Skills (comma separated)</label>
                    <input
                      className="input"
                      type="text"
                      value={(draft.startingPoint?.skills || []).join(', ')}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          startingPoint: {
                            ...d.startingPoint,
                            skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="draft-subhead full">
                    <h4 className="section-label"><Icon name="zap" /> Actions taken</h4>
                  </div>
                  <div className="full">
                    <ListEditor
                      items={draft.actions || []}
                      onChange={updateDraft('actions')}
                      placeholder="e.g. Built a landing page and shared it in two communities"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Duration</label>
                    <input
                      className="input"
                      type="text"
                      value={draft.duration || ''}
                      onChange={(e) => updateDraft('duration')(e.target.value)}
                      placeholder="e.g. 4 months"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Investment</label>
                    <input
                      className="input"
                      type="text"
                      value={draft.investment || ''}
                      onChange={(e) => updateDraft('investment')(e.target.value)}
                      placeholder="e.g. $800 and ~200 hours"
                    />
                  </div>
                  <div className="field full">
                    <label className="label">Outcome</label>
                    <input
                      className="input"
                      type="text"
                      value={draft.outcome || ''}
                      onChange={(e) => updateDraft('outcome')(e.target.value)}
                      placeholder="e.g. First 12 paying customers"
                    />
                  </div>

                  <div className="draft-subhead full">
                    <h4 className="section-label"><Icon name="alert" /> Obstacles</h4>
                  </div>
                  <div className="full">
                    <ListEditor
                      items={draft.obstacles || []}
                      onChange={updateDraft('obstacles')}
                      placeholder="e.g. Payment gateway rejected my application twice"
                    />
                  </div>

                  <div className="draft-subhead full">
                    <h4 className="section-label"><Icon name="star" /> Lessons</h4>
                  </div>
                  <div className="full">
                    <ListEditor
                      items={draft.lessons || []}
                      onChange={updateDraft('lessons')}
                      placeholder="e.g. Talk to customers before building features"
                    />
                  </div>
                </div>

                <div className="form-actions draft-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleContinueToShare}
                    disabled={continuing}
                  >
                    <Icon name="arrowRight" />
                    {continuing ? 'Saving…' : 'Continue in Share form'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
