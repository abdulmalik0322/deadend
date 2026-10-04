import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import '../Login/Login.css';
import './ForgotPassword.css';

export default function ForgotPassword() {
  useDocumentTitle('Reset password — DEADEND');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
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

        {!sent ? (
          <>
            <h1 className="auth-title">Reset your password</h1>
            <p className="auth-sub">
              Enter the email you signed up with and we will send you a reset link.
            </p>

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
              <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
                <Icon name="arrowRight" />
              </button>
            </form>

          </>
        ) : (
          <div className="auth-success">
            <span className="success-icon">
              <Icon name="check" />
            </span>
            <h1>Check your inbox</h1>
            <p>
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
              The link expires after 60 minutes.
            </p>
            <Link to="/login" className="auth-link">Back to sign in</Link>
          </div>
        )}

        {!sent && (
          <p className="auth-switch">
            Remembered it? <Link to="/login" className="auth-link">Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
