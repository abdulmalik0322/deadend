import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import StepWizard from '../../components/StepWizard/StepWizard.jsx';
import ProgressBar from '../../components/ProgressBar/ProgressBar.jsx';
import OutcomeBadge from '../../components/OutcomeBadge/OutcomeBadge.jsx';
import TagList from '../../components/TagList/TagList.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './Share.css';

const STEPS = [
  { label: 'Goal', title: 'What were you trying to achieve?' },
  { label: 'Situation', title: 'What was your starting situation?' },
  { label: 'Actions', title: 'What did you do?' },
  { label: 'Outcome', title: 'What happened?' },
  { label: 'Obstacles', title: 'What went wrong?' },
  { label: 'Lessons', title: 'What did you learn?' },
  { label: 'Advice', title: 'What would you do differently?' },
  { label: 'Privacy', title: 'Privacy & review' },
];

const CATEGORIES = [
  'Business', 'Career', 'Education', 'Finance', 'Health',
  'Relationships', 'Technology', 'Travel', 'Other',
];

const OUTCOMES = [
  { value: 'succeeded', label: 'It succeeded', desc: 'You reached your goal.' },
  { value: 'partial', label: 'Partially succeeded', desc: 'Some progress, goal not fully reached.' },
  { value: 'failed', label: 'It failed', desc: 'The goal was not reached.' },
  { value: 'abandoned', label: 'Abandoned', desc: 'You stopped before knowing the result.' },
];

const PRIVACY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    desc: 'Visible to everyone on DEADEND, linked to your profile.',
  },
  {
    value: 'anonymous',
    label: 'Anonymous',
    desc: 'Published publicly, but without your name or profile.',
  },
  {
    value: 'private',
    label: 'Private',
    desc: 'Only you can see it. Useful as a personal record.',
  },
];

const initialForm = () => ({
  title: '',
  goal: '',
  category: '',
  country: '',
  education: '',
  experienceLevel: '',
  budget: '',
  timeAvailable: '',
  location: '',
  skills: '',
  timelineEvents: [{ label: '', text: '' }],
  outcome: '',
  duration: '',
  moneyInvested: '',
  timeInvested: '',
  tools: '',
  obstacles: [''],
  whatWorked: [''],
  lessons: [''],
  doDifferently: [''],
  tags: '',
  privacy: 'public',
});

const csvToArray = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function Share() {
  useDocumentTitle('Share an Experience | DEADEND');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [clearing, setClearing] = useState(false);
  const firstErrorRef = useRef(null);

  // Load saved draft
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const draft = await api.loadDraft('share');
        if (alive && draft && typeof draft === 'object') {
          setForm((f) => ({ ...f, ...draft }));
          setDraftSavedAt(new Date());
        }
      } catch {
        // Draft is best-effort; a failed load should not block the form.
      } finally {
        if (alive) setDraftLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Autosave (debounced 800ms)
  useEffect(() => {
    if (!draftLoaded) return;
    setDraftDirty(true);
    const t = setTimeout(async () => {
      try {
        await api.saveDraft('share', form);
        setDraftSavedAt(new Date());
        setDraftDirty(false);
      } catch {
        // Keep the dirty flag so the user knows the draft did not save.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [form, draftLoaded]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setListItem = (key, index, value) => {
    setForm((f) => {
      const next = [...f[key]];
      next[index] = value;
      return { ...f, [key]: next };
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addListItem = (key, blank) => {
    setForm((f) => ({ ...f, [key]: [...f[key], blank] }));
  };

  const removeListItem = (key, index) => {
    setForm((f) => {
      const next = f[key].filter((_, i) => i !== index);
      return { ...f, [key]: next.length > 0 ? next : [typeof f[key][0] === 'object' ? { label: '', text: '' } : ''] };
    });
  };

  const nonEmpty = (arr) => arr.filter((x) =>
    typeof x === 'object' ? x.text.trim() !== '' : String(x).trim() !== ''
  );

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (form.title.trim().length < 8) e.title = 'Give your experience a clear title (at least 8 characters).';
      if (!form.goal.trim()) e.goal = 'Describe the goal you were aiming for.';
      if (!form.category) e.category = 'Pick a category.';
      if (!form.country.trim()) e.country = 'Which country did this happen in?';
    } else if (s === 1) {
      if (!form.education.trim()) e.education = 'Your education level is required.';
      if (!form.experienceLevel.trim()) e.experienceLevel = 'Your experience level is required.';
      if (!form.budget.trim()) e.budget = 'Your starting budget is required.';
      if (!form.timeAvailable.trim()) e.timeAvailable = 'How much time you had is required.';
      if (!form.location.trim()) e.location = 'Your location is required.';
    } else if (s === 2) {
      if (nonEmpty(form.timelineEvents).length === 0) {
        e.timelineEvents = 'Add at least one step describing what you did.';
      }
    } else if (s === 3) {
      if (!form.outcome) e.outcome = 'Select the outcome of your experience.';
      if (!form.duration.trim()) e.duration = 'How long did it take?';
      if (!form.moneyInvested.trim()) e.moneyInvested = 'How much money did you invest? Enter 0 if none.';
      if (!form.timeInvested.trim()) e.timeInvested = 'How much time did you invest?';
    } else if (s === 4) {
      if (nonEmpty(form.obstacles).length === 0) e.obstacles = 'Add at least one obstacle you faced.';
    } else if (s === 5) {
      if (nonEmpty(form.lessons).length === 0) e.lessons = 'Add at least one lesson you learned.';
    } else if (s === 6) {
      if (nonEmpty(form.doDifferently).length === 0) {
        e.doDifferently = 'Add at least one thing you would do differently.';
      }
    }
    return e;
  };

  const goToStep = (target) => {
    if (target === step || submitting) return;
    if (target > step) {
      for (let s = step; s < target; s++) {
        const e = validateStep(s);
        if (Object.keys(e).length > 0) {
          setErrors(e);
          setStep(s);
          return;
        }
      }
    }
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinue = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      if (firstErrorRef.current) firstErrorRef.current.focus();
      return;
    }
    setErrors({});
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step > 0 && !submitting) {
      setErrors({});
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearDraft = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await api.clearDraft('share');
      setForm(initialForm());
      setStep(0);
      setErrors({});
      setDraftSavedAt(null);
      setDraftDirty(false);
      toast.success('Draft cleared.');
    } catch {
      toast.error('Could not clear the draft. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const handleSubmit = async () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        goal: form.goal.trim(),
        category: form.category,
        country: form.country.trim(),
        situation: {
          education: form.education.trim(),
          experienceLevel: form.experienceLevel.trim(),
          budget: form.budget.trim(),
          timeAvailable: form.timeAvailable.trim(),
          location: form.location.trim(),
          skills: csvToArray(form.skills),
        },
        timeline: nonEmpty(form.timelineEvents).map((ev) => ({
          label: ev.label.trim(),
          text: ev.text.trim(),
        })),
        outcome: form.outcome,
        duration: form.duration.trim(),
        moneyInvested: form.moneyInvested.trim(),
        timeInvested: form.timeInvested.trim(),
        tools: csvToArray(form.tools),
        obstacles: nonEmpty(form.obstacles).map((x) => String(x).trim()),
        whatWorked: nonEmpty(form.whatWorked).map((x) => String(x).trim()),
        lessons: nonEmpty(form.lessons).map((x) => String(x).trim()),
        doDifferently: nonEmpty(form.doDifferently).map((x) => String(x).trim()),
        tags: csvToArray(form.tags),
        privacy: form.privacy,
      };
      const res = await api.createExperience(payload);
      await api.clearDraft('share');
      toast.success('Experience submitted for review.');
      navigate(`/experiences/${res?.slug || res?.id || ''}`);
    } catch {
      toast.error('Could not submit your experience. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  const firstErrorKey = Object.keys(errors)[0];

  const fieldError = (key) =>
    errors[key] ? (
      <p className="share-error" role="alert" id={`share-err-${key}`} ref={key === firstErrorKey ? firstErrorRef : null} tabIndex={-1}>
        {errors[key]}
      </p>
    ) : null;

  const renderDynamicList = ({ key, label, hint, placeholder, errorKey }) => (
    <div className="share-field">
      <span className="share-label" id={`share-${key}-label`}>{label}</span>
      {hint && <p className="share-hint">{hint}</p>}
      <div className="share-dynamic" role="group" aria-labelledby={`share-${key}-label`}>
        {form[key].map((item, i) => (
          <div className="share-dynamic-row" key={i}>
            <input
              type="text"
              className="share-input"
              value={item}
              onChange={(e) => setListItem(key, i, e.target.value)}
              placeholder={placeholder}
              aria-label={`${label} ${i + 1}`}
              aria-invalid={Boolean(errors[errorKey || key])}
              aria-describedby={errors[errorKey || key] ? `share-err-${errorKey || key}` : undefined}
              disabled={submitting}
            />
            <button
              type="button"
              className="share-icon-btn"
              onClick={() => removeListItem(key, i)}
              disabled={submitting || form[key].length <= 1}
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              title="Remove"
            >
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="share-add-btn"
        onClick={() => addListItem(key, '')}
        disabled={submitting}
      >
        <Icon name="plus" /> Add another
      </button>
      {fieldError(errorKey || key)}
    </div>
  );

  const renderTimelineEvents = () => (
    <div className="share-field">
      <span className="share-label" id="share-timeline-label">Timeline of what you did</span>
      <p className="share-hint">Walk through the key steps in order, from first action to last.</p>
      <div className="share-dynamic" role="group" aria-labelledby="share-timeline-label">
        {form.timelineEvents.map((ev, i) => (
          <div className="share-timeline-row" key={i}>
            <div className="share-timeline-num" aria-hidden="true">{i + 1}</div>
            <div className="share-timeline-inputs">
              <input
                type="text"
                className="share-input"
                value={ev.label}
                onChange={(e) => setListItem('timelineEvents', i, { ...ev, label: e.target.value })}
                placeholder="Step label (e.g. Launched the store)"
                aria-label={`Step ${i + 1} label`}
                disabled={submitting}
              />
              <textarea
                className="share-input"
                rows={2}
                value={ev.text}
                onChange={(e) => setListItem('timelineEvents', i, { ...ev, text: e.target.value })}
                placeholder="What exactly did you do at this step?"
                aria-label={`Step ${i + 1} details`}
                disabled={submitting}
              />
            </div>
            <button
              type="button"
              className="share-icon-btn"
              onClick={() => removeListItem('timelineEvents', i)}
              disabled={submitting || form.timelineEvents.length <= 1}
              aria-label={`Remove step ${i + 1}`}
              title="Remove step"
            >
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="share-add-btn"
        onClick={() => addListItem('timelineEvents', { label: '', text: '' })}
        disabled={submitting}
      >
        <Icon name="plus" /> Add step
      </button>
      {fieldError('timelineEvents')}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <div className="share-field">
              <label className="share-label" htmlFor="share-title">Title</label>
              <input
                id="share-title"
                type="text"
                className="share-input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. I tried dropshipping for 6 months with $500"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'share-err-title' : undefined}
                disabled={submitting}
              />
              {fieldError('title')}
            </div>
            <div className="share-field">
              <label className="share-label" htmlFor="share-goal">Your goal</label>
              <textarea
                id="share-goal"
                className="share-input"
                rows={3}
                value={form.goal}
                onChange={(e) => set('goal', e.target.value)}
                placeholder="What exactly were you trying to achieve?"
                aria-invalid={Boolean(errors.goal)}
                aria-describedby={errors.goal ? 'share-err-goal' : undefined}
                disabled={submitting}
              />
              {fieldError('goal')}
            </div>
            <div className="share-grid-2">
              <div className="share-field">
                <label className="share-label" htmlFor="share-category">Category</label>
                <select
                  id="share-category"
                  className="share-input"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? 'share-err-category' : undefined}
                  disabled={submitting}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {fieldError('category')}
              </div>
              <div className="share-field">
                <label className="share-label" htmlFor="share-country">Country</label>
                <input
                  id="share-country"
                  type="text"
                  className="share-input"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="e.g. Pakistan"
                  aria-invalid={Boolean(errors.country)}
                  aria-describedby={errors.country ? 'share-err-country' : undefined}
                  disabled={submitting}
                />
                {fieldError('country')}
              </div>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <div className="share-grid-2">
              <div className="share-field">
                <label className="share-label" htmlFor="share-education"><Icon name="graduation" size={14} /> Education</label>
                <input id="share-education" type="text" className="share-input" value={form.education}
                  onChange={(e) => set('education', e.target.value)} placeholder="e.g. BS Computer Science"
                  aria-invalid={Boolean(errors.education)} aria-describedby={errors.education ? 'share-err-education' : undefined} disabled={submitting} />
                {fieldError('education')}
              </div>
              <div className="share-field">
                <label className="share-label" htmlFor="share-exp-level"><Icon name="chart" size={14} /> Experience level</label>
                <input id="share-exp-level" type="text" className="share-input" value={form.experienceLevel}
                  onChange={(e) => set('experienceLevel', e.target.value)} placeholder="e.g. Beginner, 2 years in marketing"
                  aria-invalid={Boolean(errors.experienceLevel)} aria-describedby={errors.experienceLevel ? 'share-err-experienceLevel' : undefined} disabled={submitting} />
                {fieldError('experienceLevel')}
              </div>
              <div className="share-field">
                <label className="share-label" htmlFor="share-budget"><Icon name="wallet" size={14} /> Starting budget</label>
                <input id="share-budget" type="text" className="share-input" value={form.budget}
                  onChange={(e) => set('budget', e.target.value)} placeholder="e.g. PKR 50,000"
                  aria-invalid={Boolean(errors.budget)} aria-describedby={errors.budget ? 'share-err-budget' : undefined} disabled={submitting} />
                {fieldError('budget')}
              </div>
              <div className="share-field">
                <label className="share-label" htmlFor="share-time"><Icon name="clock" size={14} /> Time available</label>
                <input id="share-time" type="text" className="share-input" value={form.timeAvailable}
                  onChange={(e) => set('timeAvailable', e.target.value)} placeholder="e.g. 2 hours per day"
                  aria-invalid={Boolean(errors.timeAvailable)} aria-describedby={errors.timeAvailable ? 'share-err-timeAvailable' : undefined} disabled={submitting} />
                {fieldError('timeAvailable')}
              </div>
            </div>
            <div className="share-field">
              <label className="share-label" htmlFor="share-location"><Icon name="pin" size={14} /> Location</label>
              <input id="share-location" type="text" className="share-input" value={form.location}
                onChange={(e) => set('location', e.target.value)} placeholder="e.g. Lahore"
                aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? 'share-err-location' : undefined} disabled={submitting} />
              {fieldError('location')}
            </div>
            <div className="share-field">
              <label className="share-label" htmlFor="share-skills"><Icon name="zap" size={14} /> Relevant skills</label>
              <input id="share-skills" type="text" className="share-input" value={form.skills}
                onChange={(e) => set('skills', e.target.value)} placeholder="Comma separated, e.g. design, copywriting, Excel"
                disabled={submitting} />
              <p className="share-hint">Separate multiple skills with commas.</p>
            </div>
          </>
        );
      case 2:
        return renderTimelineEvents();
      case 3:
        return (
          <>
            <div className="share-field">
              <span className="share-label" id="share-outcome-label">Outcome</span>
              <div className="share-radio-grid" role="radiogroup" aria-labelledby="share-outcome-label">
                {OUTCOMES.map((o) => (
                  <label key={o.value} className={`share-radio-card${form.outcome === o.value ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="outcome"
                      value={o.value}
                      checked={form.outcome === o.value}
                      onChange={() => set('outcome', o.value)}
                      disabled={submitting}
                    />
                    <span className="share-radio-title">{o.label}</span>
                    <span className="share-radio-desc">{o.desc}</span>
                  </label>
                ))}
              </div>
              {fieldError('outcome')}
            </div>
            <div className="share-grid-2">
              <div className="share-field">
                <label className="share-label" htmlFor="share-duration">Duration</label>
                <input id="share-duration" type="text" className="share-input" value={form.duration}
                  onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 6 months"
                  aria-invalid={Boolean(errors.duration)} aria-describedby={errors.duration ? 'share-err-duration' : undefined} disabled={submitting} />
                {fieldError('duration')}
              </div>
              <div className="share-field">
                <label className="share-label" htmlFor="share-money">Money invested</label>
                <input id="share-money" type="text" className="share-input" value={form.moneyInvested}
                  onChange={(e) => set('moneyInvested', e.target.value)} placeholder="e.g. PKR 120,000 (0 if none)"
                  aria-invalid={Boolean(errors.moneyInvested)} aria-describedby={errors.moneyInvested ? 'share-err-moneyInvested' : undefined} disabled={submitting} />
                {fieldError('moneyInvested')}
              </div>
            </div>
            <div className="share-field">
              <label className="share-label" htmlFor="share-timeinvested">Time invested</label>
              <input id="share-timeinvested" type="text" className="share-input" value={form.timeInvested}
                onChange={(e) => set('timeInvested', e.target.value)} placeholder="e.g. 300 hours total"
                aria-invalid={Boolean(errors.timeInvested)} aria-describedby={errors.timeInvested ? 'share-err-timeInvested' : undefined} disabled={submitting} />
              {fieldError('timeInvested')}
            </div>
            <div className="share-field">
              <label className="share-label" htmlFor="share-tools">Tools used</label>
              <input id="share-tools" type="text" className="share-input" value={form.tools}
                onChange={(e) => set('tools', e.target.value)} placeholder="Comma separated, e.g. Shopify, Canva, Meta Ads"
                disabled={submitting} />
            </div>
          </>
        );
      case 4:
        return renderDynamicList({
          key: 'obstacles',
          label: 'Obstacles you faced',
          hint: 'Be honest — the hard parts are the most valuable to readers.',
          placeholder: 'e.g. Ad costs kept rising and ate the margin',
        });
      case 5:
        return (
          <>
            {renderDynamicList({
              key: 'whatWorked',
              label: 'What worked',
              hint: 'Anything that went right, even small wins.',
              placeholder: 'e.g. Organic TikTok videos brought free traffic',
            })}
            {renderDynamicList({
              key: 'lessons',
              label: 'Lessons learned',
              hint: 'The insights you would pass to someone starting today.',
              placeholder: 'e.g. Test demand before buying inventory',
            })}
          </>
        );
      case 6:
        return (
          <>
            {renderDynamicList({
              key: 'doDifferently',
              label: 'What you would do differently',
              hint: 'Concrete changes you would make if you started over.',
              placeholder: 'e.g. Start with one product instead of ten',
            })}
            <div className="share-field">
              <label className="share-label" htmlFor="share-tags">Tags</label>
              <input id="share-tags" type="text" className="share-input" value={form.tags}
                onChange={(e) => set('tags', e.target.value)} placeholder="Comma separated, e.g. ecommerce, first-business"
                disabled={submitting} />
              <p className="share-hint">Tags help others find your experience.</p>
            </div>
          </>
        );
      case 7:
        return (
          <>
            <div className="share-field">
              <span className="share-label" id="share-privacy-label">Who can see this?</span>
              <div className="share-radio-grid" role="radiogroup" aria-labelledby="share-privacy-label">
                {PRIVACY_OPTIONS.map((p) => (
                  <label key={p.value} className={`share-radio-card${form.privacy === p.value ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="privacy"
                      value={p.value}
                      checked={form.privacy === p.value}
                      onChange={() => set('privacy', p.value)}
                      disabled={submitting}
                    />
                    <span className="share-radio-title">{p.label}</span>
                    <span className="share-radio-desc">{p.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="share-review">
              <h3>Review your experience</h3>
              <div className="share-review-block">
                <div className="share-review-head">
                  <h4>{form.title || 'Untitled experience'}</h4>
                  <button type="button" className="share-link-btn" onClick={() => goToStep(0)} disabled={submitting}>Edit</button>
                </div>
                <p className="share-review-goal">{form.goal || 'No goal described yet.'}</p>
                <div className="share-review-meta">
                  <span>{form.category || 'No category'}</span>
                  <span>{form.country || 'No country'}</span>
                  {form.outcome && <OutcomeBadge outcome={form.outcome} />}
                </div>
                {csvToArray(form.tags).length > 0 && <TagList tags={csvToArray(form.tags)} />}
              </div>
              <div className="share-review-grid">
                <div>
                  <h5>Situation</h5>
                  <ul>
                    <li>{form.education || '—'} · {form.experienceLevel || '—'}</li>
                    <li>Budget: {form.budget || '—'} · Time: {form.timeAvailable || '—'}</li>
                    <li>{form.location || '—'}</li>
                  </ul>
                </div>
                <div>
                  <h5>Investment</h5>
                  <ul>
                    <li>Duration: {form.duration || '—'}</li>
                    <li>Money: {form.moneyInvested || '—'}</li>
                    <li>Time: {form.timeInvested || '—'}</li>
                  </ul>
                </div>
              </div>
              <div className="share-review-grid">
                <div>
                  <h5>Obstacles ({nonEmpty(form.obstacles).length})</h5>
                  <ul>{nonEmpty(form.obstacles).map((o, i) => <li key={i}>{String(o)}</li>)}</ul>
                </div>
                <div>
                  <h5>Lessons ({nonEmpty(form.lessons).length})</h5>
                  <ul>{nonEmpty(form.lessons).map((l, i) => <li key={i}>{String(l)}</li>)}</ul>
                </div>
              </div>
            </div>
            <p className="share-note">
              <Icon name="info" />
              Submitted experiences are reviewed before appearing publicly.
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="share-page">
      <div className="share-container">
        <header className="share-header">
          <h1>Share your experience</h1>
          <p className="share-sub">
            Your real story — wins and failures — helps others decide with evidence, not guesses.
          </p>
        </header>

        <div className="share-progress">
          <ProgressBar value={progress} />
          <div className="share-progress-row">
            <span className="share-step-count">Step {step + 1} of {STEPS.length}</span>
            <span className="share-draft-status" role="status" aria-live="polite">
              {draftDirty ? (
                'Saving draft...'
              ) : draftSavedAt ? (
                <>Draft saved · {draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
              ) : (
                ''
              )}
            </span>
          </div>
        </div>

        <StepWizard
          steps={STEPS.map((s) => ({ title: s.label }))}
          current={step}
          onStepClick={goToStep}
        />

        <div className="share-card" aria-live="polite">
          <h2 className="share-step-title">{STEPS[step].title}</h2>
          {renderStep()}
        </div>

        <div className="share-nav">
          <button
            type="button"
            className="share-btn share-btn-ghost"
            onClick={handleBack}
            disabled={step === 0 || submitting}
          >
            <Icon name="arrowLeft" /> Back
          </button>
          <button
            type="button"
            className="share-btn share-btn-text"
            onClick={handleClearDraft}
            disabled={clearing || submitting}
          >
            {clearing ? 'Clearing...' : 'Clear draft'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="share-btn share-btn-primary"
              onClick={handleContinue}
              disabled={submitting}
            >
              Continue <Icon name="arrowRight" />
            </button>
          ) : (
            <button
              type="button"
              className="share-btn share-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit experience'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
