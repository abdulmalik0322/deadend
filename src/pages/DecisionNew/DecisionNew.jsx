import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import StepWizard from '../../components/StepWizard/StepWizard.jsx';
import ProgressBar from '../../components/ProgressBar/ProgressBar.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './DecisionNew.css';

const STEPS = [
  { label: 'Decision', title: 'What are you deciding?' },
  { label: 'Situation', title: 'Your current situation' },
  { label: 'Expectations', title: 'Expected outcome' },
  { label: 'Review', title: 'Review & create' },
];

const initialForm = () => ({
  question: '',
  location: '',
  education: '',
  experience: '',
  budget: '',
  timeAvailable: '',
  skills: '',
  expectedDuration: '',
  expectedInvestment: '',
  expectedResult: '',
  goal: '',
});

const csvToArray = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function DecisionNew() {
  useDocumentTitle('New Decision | DEADEND');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const firstErrorRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const draft = await api.loadDraft('decision-new');
        if (alive && draft && typeof draft === 'object') {
          setForm((f) => ({ ...f, ...draft }));
          setDraftSavedAt(new Date());
        }
      } catch {
        // Draft is best-effort.
      } finally {
        if (alive) setDraftLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    setDraftDirty(true);
    const t = setTimeout(async () => {
      try {
        await api.saveDraft('decision-new', form);
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

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (form.question.trim().length < 10) {
        e.question = 'Phrase your decision as a clear question (at least 10 characters).';
      }
    } else if (s === 1) {
      if (!form.location.trim()) e.location = 'Your location is required.';
      if (!form.education.trim()) e.education = 'Your education is required.';
      if (!form.experience.trim()) e.experience = 'Your experience is required.';
      if (!form.budget.trim()) e.budget = 'Your available budget is required.';
      if (!form.timeAvailable.trim()) e.timeAvailable = 'Your available time is required.';
    } else if (s === 2) {
      if (!form.expectedDuration.trim()) e.expectedDuration = 'Expected duration is required.';
      if (!form.expectedInvestment.trim()) e.expectedInvestment = 'Expected investment is required.';
      if (!form.expectedResult.trim()) e.expectedResult = 'Describe the result you expect.';
      if (!form.goal.trim()) e.goal = 'State your main goal.';
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
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step > 0 && !submitting) {
      setErrors({});
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createDecision({
        title: form.question.trim(),
        situation: {
          location: form.location.trim(),
          education: form.education.trim(),
          experience: form.experience.trim(),
          budget: form.budget.trim(),
          timeAvailable: form.timeAvailable.trim(),
          skills: csvToArray(form.skills),
        },
        expectations: {
          duration: form.expectedDuration.trim(),
          investment: form.expectedInvestment.trim(),
          expectedResult: form.expectedResult.trim(),
          goal: form.goal.trim(),
        },
      });
      await api.clearDraft('decision-new');
      toast.success(`Decision ${res?.id || ''} created.`.trim());
      navigate(`/decisions/${res?.id}`);
    } catch {
      toast.error('Could not create your decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  const firstErrorKey = Object.keys(errors)[0];

  const fieldError = (key) =>
    errors[key] ? (
      <p className="dn-error" role="alert" id={`dn-err-${key}`} ref={key === firstErrorKey ? firstErrorRef : null} tabIndex={-1}>
        {errors[key]}
      </p>
    ) : null;

  const textField = ({ id, label, value, onChange, placeholder, hint, errorKey, textarea }) => (
    <div className="dn-field">
      <label className="dn-label" htmlFor={id}>{label}</label>
      {hint && <p className="dn-hint">{hint}</p>}
      {textarea ? (
        <textarea
          id={id}
          className="dn-input"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(errors[errorKey])}
          aria-describedby={errors[errorKey] ? `dn-err-${errorKey}` : undefined}
          disabled={submitting}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="dn-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(errors[errorKey])}
          aria-describedby={errors[errorKey] ? `dn-err-${errorKey}` : undefined}
          disabled={submitting}
        />
      )}
      {fieldError(errorKey)}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return textField({
          id: 'dn-question',
          label: 'Your decision, as a question',
          value: form.question,
          onChange: (v) => set('question', v),
          placeholder: 'Should I start a clothing business?',
          hint: 'One clear question. You will compare the real outcome against it later.',
          errorKey: 'question',
          textarea: true,
        });
      case 1:
        return (
          <>
            <div className="dn-grid-2">
              {textField({ id: 'dn-location', label: 'Location', value: form.location, onChange: (v) => set('location', v), placeholder: 'e.g. Karachi', errorKey: 'location' })}
              {textField({ id: 'dn-education', label: 'Education', value: form.education, onChange: (v) => set('education', v), placeholder: 'e.g. BS Computer Science', errorKey: 'education' })}
              {textField({ id: 'dn-experience', label: 'Experience', value: form.experience, onChange: (v) => set('experience', v), placeholder: 'e.g. 1 year freelancing', errorKey: 'experience' })}
              {textField({ id: 'dn-budget', label: 'Available budget', value: form.budget, onChange: (v) => set('budget', v), placeholder: 'e.g. PKR 100,000', errorKey: 'budget' })}
            </div>
            {textField({ id: 'dn-time', label: 'Time available', value: form.timeAvailable, onChange: (v) => set('timeAvailable', v), placeholder: 'e.g. 3 hours per day', errorKey: 'timeAvailable' })}
            {textField({
              id: 'dn-skills', label: 'Skills', value: form.skills, onChange: (v) => set('skills', v),
              placeholder: 'Comma separated, e.g. marketing, stitching, accounting',
              hint: 'Separate multiple skills with commas.', errorKey: 'skills',
            })}
          </>
        );
      case 2:
        return (
          <>
            <div className="dn-grid-2">
              {textField({ id: 'dn-exp-duration', label: 'Expected duration', value: form.expectedDuration, onChange: (v) => set('expectedDuration', v), placeholder: 'e.g. 6 months', errorKey: 'expectedDuration' })}
              {textField({ id: 'dn-exp-investment', label: 'Expected investment', value: form.expectedInvestment, onChange: (v) => set('expectedInvestment', v), placeholder: 'e.g. PKR 150,000', errorKey: 'expectedInvestment' })}
            </div>
            {textField({
              id: 'dn-exp-result', label: 'Expected income / result', value: form.expectedResult,
              onChange: (v) => set('expectedResult', v), placeholder: 'e.g. PKR 40,000 monthly profit',
              errorKey: 'expectedResult', textarea: true,
            })}
            {textField({
              id: 'dn-goal', label: 'Main goal', value: form.goal,
              onChange: (v) => set('goal', v), placeholder: 'e.g. Build a second income stream',
              errorKey: 'goal', textarea: true,
            })}
          </>
        );
      case 3: {
        const skills = csvToArray(form.skills);
        return (
          <div className="dn-review">
            <div className="dn-review-block">
              <div className="dn-review-head">
                <h3>{form.question}</h3>
                <button type="button" className="dn-link-btn" onClick={() => goToStep(0)} disabled={submitting}>Edit</button>
              </div>
            </div>
            <div className="dn-review-block">
              <div className="dn-review-head">
                <h4>Current situation</h4>
                <button type="button" className="dn-link-btn" onClick={() => goToStep(1)} disabled={submitting}>Edit</button>
              </div>
              <dl className="dn-review-list">
                <div><dt>Location</dt><dd>{form.location}</dd></div>
                <div><dt>Education</dt><dd>{form.education}</dd></div>
                <div><dt>Experience</dt><dd>{form.experience}</dd></div>
                <div><dt>Budget</dt><dd>{form.budget}</dd></div>
                <div><dt>Time available</dt><dd>{form.timeAvailable}</dd></div>
                <div><dt>Skills</dt><dd>{skills.length > 0 ? skills.join(', ') : '—'}</dd></div>
              </dl>
            </div>
            <div className="dn-review-block">
              <div className="dn-review-head">
                <h4>Expected outcome</h4>
                <button type="button" className="dn-link-btn" onClick={() => goToStep(2)} disabled={submitting}>Edit</button>
              </div>
              <dl className="dn-review-list">
                <div><dt>Duration</dt><dd>{form.expectedDuration}</dd></div>
                <div><dt>Investment</dt><dd>{form.expectedInvestment}</dd></div>
                <div><dt>Expected result</dt><dd>{form.expectedResult}</dd></div>
                <div><dt>Main goal</dt><dd>{form.goal}</dd></div>
              </dl>
            </div>
            <p className="dn-note">
              <Icon name="info" />
              Once created, you can log milestones, updates, and the final outcome as your decision unfolds.
            </p>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="dn-page">
      <div className="dn-container">
        <header className="dn-header">
          <h1>Create a decision</h1>
          <p className="dn-sub">Define it clearly now — measure it honestly later.</p>
        </header>

        <div className="dn-progress">
          <ProgressBar value={progress} />
          <div className="dn-progress-row">
            <span className="dn-step-count">Step {step + 1} of {STEPS.length}</span>
            <span className="dn-draft-status" role="status" aria-live="polite">
              {draftDirty ? 'Saving draft...' : draftSavedAt ? 'Draft saved' : ''}
            </span>
          </div>
        </div>

        <StepWizard
          steps={STEPS.map((s) => ({ title: s.label }))}
          current={step}
          onStepClick={goToStep}
        />

        <div className="dn-card" aria-live="polite">
          <h2 className="dn-step-title">{STEPS[step].title}</h2>
          {renderStep()}
        </div>

        <div className="dn-nav">
          <button
            type="button"
            className="dn-btn dn-btn-ghost"
            onClick={handleBack}
            disabled={step === 0 || submitting}
          >
            <Icon name="arrowLeft" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="dn-btn dn-btn-primary"
              onClick={handleContinue}
              disabled={submitting}
            >
              Continue <Icon name="arrowRight" />
            </button>
          ) : (
            <button
              type="button"
              className="dn-btn dn-btn-primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create decision'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
