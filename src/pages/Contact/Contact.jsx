import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast/Toast.jsx';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import '../Login/Login.css';
import './Contact.css';

const TOPICS = ['General question', 'Account support', 'Partnerships', 'Press', 'Safety concern'];

export default function Contact() {
  useDocumentTitle('Contact — DEADEND');
  const { toast } = useToast();
  const revealRef = useReveal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    // Mock send: no real email leaves the browser.
    setTimeout(() => {
      setSending(false);
      setName('');
      setEmail('');
      setTopic(TOPICS[0]);
      setMessage('');
      toast.success('Message received. We reply within 2 business days.');
    }, 600);
  };

  return (
    <div className="static-page" ref={revealRef}>
      <div className="static-hero">
        <p className="static-kicker">Contact</p>
        <h1>Talk to us.</h1>
        <p className="static-lede">
          Questions, feedback, partnerships, or press — send a message and a human will read it.
        </p>
      </div>

      <div className="contact-grid">
        <form className="contact-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

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
            <span className="field-label">Topic</span>
            <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Message</span>
            <textarea
              className="input contact-textarea"
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </label>

          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
            <Icon name="arrowRight" />
          </button>
        </form>

        <aside className="contact-side">
          <div className="contact-card">
            <span className="contact-card-icon"><Icon name="clock" /></span>
            <h3>Response time</h3>
            <p>We reply within 2 business days. Urgent safety issues are reviewed first.</p>
          </div>
          <div className="contact-card">
            <span className="contact-card-icon"><Icon name="shield" /></span>
            <h3>Report content</h3>
            <p>
              Spotted something that breaks the rules? Use the report button on the content
              itself — it reaches moderators faster than this form.
            </p>
            <Link to="/guidelines" className="auth-link">Read the community guidelines</Link>
          </div>
          <div className="contact-card">
            <span className="contact-card-icon"><Icon name="lock" /></span>
            <h3>Privacy first</h3>
            <p>
              Never include passwords or sensitive personal details in your message.
              See how we handle your data in the <Link to="/privacy" className="auth-link">Privacy Policy</Link>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
