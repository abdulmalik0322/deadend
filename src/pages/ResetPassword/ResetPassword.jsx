import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { useToast } from '../../components/Toast/Toast.jsx';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import '../Login/Login.css';
import './ResetPassword.css';

export default function ResetPassword() {
  useDocumentTitle('Set new password — DEADEND');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // The backend validates the reset token (SHA-256 hash, 1-hour expiry).
      await api.resetPassword(token, password);
      setDone(true);
      toast.success('Password updated.');
    } catch (err) {
      setError(err?.message || 'Could not reset your password. The link may have expired.');
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

        {!done ? (
          <>
            <h1 className="auth-title">Choose a new password</h1>
            <p className="auth-sub">Make it strong — at least 8 characters, and not one you use elsewhere.</p>

            {error && (
              <div className="auth-error" role="alert">
                <Icon name="alert" />
                <span>{error}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span className="field-label">New password</span>
                <input
                  type="password"
                  className="input"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Confirm new password</span>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
              <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
                <Icon name="arrowRight" />
              </button>
            </form>
          </>
        ) : (
          <div className="auth-success">
            <span className="success-icon">
              <Icon name="check" />
            </span>
            <h1>Password updated</h1>
            <p>Your password has been changed. Sign in with your new password to continue.</p>
            <button type="button" className="btn-primary auth-submit" onClick={() => navigate('/login')}>
              Back to sign in
              <Icon name="arrowRight" />
            </button>
          </div>
        )}

        {!done && (
          <p className="auth-switch">
            <Link to="/login" className="auth-link">Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
