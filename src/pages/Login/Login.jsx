import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import './Login.css';

const DEMO_ACCOUNTS = [
  { role: 'Contributor', email: 'demo@deadend.app', password: 'demo1234' },
  { role: 'Admin', email: 'admin@deadend.app', password: 'admin1234' },
];

export default function Login() {
  useDocumentTitle('Sign in — DEADEND');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/dashboard';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Sign in failed. Check your email and password and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">DEADEND</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to pick up where your decisions left off.</p>

        {error && (
          <div className="auth-error" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
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
          </label>

          <div className="auth-row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            <Icon name="arrowRight" />
          </button>
        </form>

        <div className="demo-box">
          <p className="demo-title">Try the demo</p>
          <div className="demo-buttons">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                className="demo-btn"
                onClick={() => fillDemo(account)}
              >
                <span className="demo-role">{account.role}</span>
                <span className="demo-email">{account.email}</span>
              </button>
            ))}
          </div>
          <p className="demo-hint">Click a card to fill the form, then press Sign in.</p>
        </div>

        <p className="auth-switch">
          New here? <Link to="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
