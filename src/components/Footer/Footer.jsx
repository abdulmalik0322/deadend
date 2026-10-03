import { Link } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import './Footer.css';

const COLS = [
  {
    heading: 'Explore',
    links: [
      { to: '/explore', label: 'Experiences' },
      { to: '/categories', label: 'Categories' },
      { to: '/decisions', label: 'Decisions' },
    ],
  },
  {
    heading: 'Product',
    links: [
      { to: '/how-it-works', label: 'How It Works' },
      { to: '/analysis', label: 'AI Analysis' },
      { to: '/privacy', label: 'Privacy' },
      { to: '/privacy', label: 'Security' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { to: '/share', label: 'Share Experience' },
      { to: '/guidelines', label: 'Guidelines' },
      { to: '/contact', label: 'Report Content' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/terms', label: 'Terms' },
      { to: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="DEADEND home">
              <span className="footer-logo-mark" aria-hidden="true">
                D
              </span>
              <span className="footer-logo-word">DEADEND</span>
            </Link>
            <p className="footer-tagline">Before You Decide, See What Happened.</p>
            <p className="footer-demo-note">
              Demo build — content shown is fictional sample data.
            </p>
          </div>
          {COLS.map((col) => (
            <nav key={col.heading} className="footer-col" aria-label={col.heading}>
              <h4 className="footer-col-heading">{col.heading}</h4>
              <ul className="footer-col-links">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 DEADEND</span>
          <span className="footer-demo-flag">Demo dataset</span>
          <a
            href="https://github.com/abdulmalik0322/deadend"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-github"
            aria-label="DEADEND on GitHub"
          >
            <Icon name="external" size={14} />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
