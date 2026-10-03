import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import '../Login/Login.css';
import './Register.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function Register() {
  useDocumentTitle('Create account — DEADEND');
  const navigate = useNavigate();
  const { user, register } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const errors = {
    name: name.trim() ? '' : 'Please enter your name.',
    email: EMAIL_RE.test(email.trim()) ? '' : 'Enter a valid email address.',
    password: password.length >= 8 ? '' : 'Password must be at least 8 characters.',
    confirm: confirm === password && confirm ? '' : 'Passwords do not match.',
    terms: acceptTerms ? '' : 'You must accept the Terms to continue.',
  };

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const strength = passwordScore(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true, terms: true });
    if (Object.values(errors).some(Boolean)) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success('Account created. Welcome to DEADEND.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err?.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">DEADEND</span>
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">
          Join a community turning real decisions into structured, searchable knowledge.
        </p>

        {submitError && (
          <div className="auth-error" role="alert">
            <Icon name="alert" />
            <span>{submitError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              className={`input ${touched.name && errors.name ? 'input-error' : ''}`}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched('name')}
              autoComplete="name"
            />
            {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              className={`input ${touched.email && errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched('email')}
              autoComplete="email"
            />
            {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
          </label>

          <div className="field">
            <span className="field-label">Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`input ${touched.password && errors.password ? 'input-error' : ''}`}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye' : 'lock'} />
              </button>
            </div>
            {password && (
              <div className="strength-meter" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`strength-seg ${strength >= n ? `on-${strength}` : ''}`} />
                ))}
              </div>
            )}
            {touched.password && errors.password
              ? <span className="field-error">{errors.password}</span>
              : <span className="field-hint">Use at least 8 characters. Longer and mixed is stronger.</span>}
          </div>

          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              type="password"
              className={`input ${touched.confirm && errors.confirm ? 'input-error' : ''}`}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => markTouched('confirm')}
              autoComplete="new-password"
            />
            {touched.confirm && errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </label>

          <label className="check terms-line">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              onBlur={() => markTouched('terms')}
            />
            <span>
              I accept the <Link to="/terms" className="auth-link">Terms of Service</Link> and the{' '}
              <Link to="/privacy" className="auth-link">Privacy Policy</Link>.
            </span>
          </label>
          {touched.terms && errors.terms && <span className="field-error">{errors.terms}</span>}

          <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
            <Icon name="arrowRight" />
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
