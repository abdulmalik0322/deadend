import { Link } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import '../Login/Login.css';
import './NotFound.css';

export default function NotFound() {
  useDocumentTitle('Page not found — DEADEND');

  return (
    <div className="notfound-page">
      <p className="notfound-kicker">Error 404</p>
      <h1 className="notfound-code">404</h1>
      <p className="notfound-message">This path led to a dead end.</p>
      <p className="notfound-sub">
        The page you are looking for does not exist, was moved, or was never a real decision
        to begin with. Here are two better paths:
      </p>
      <div className="notfound-actions">
        <Link to="/explore" className="btn-primary">
          <Icon name="search" />
          Explore experiences
        </Link>
        <Link to="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
