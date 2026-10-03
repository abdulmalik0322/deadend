import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import Avatar from '../Avatar/Avatar.jsx';
import './Navbar.css';

const LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/decisions', label: 'Decisions' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/categories', label: 'Categories' },
];

function Logo() {
  return (
    <Link to="/" className="navbar-logo" aria-label="DEADEND home">
      <span className="navbar-logo-mark" aria-hidden="true">
        D
      </span>
      <span className="navbar-logo-word">DEADEND</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listNotifications({ limit: 50 });
        const items = res?.notifications ?? res?.data ?? [];
        if (!cancelled) setUnread(items.filter((n) => !n.read).length);
      } catch {
        if (!cancelled) setUnread(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setDropOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    setDropOpen(false);
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar-inner container">
        <Logo />

        <nav className="navbar-links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `navbar-link${isActive ? ' navbar-link--active' : ''}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <Link to="/explore" className="navbar-icon-btn" aria-label="Search">
            <Icon name="search" size={18} />
          </Link>

          {user ? (
            <>
              <Link
                to="/notifications"
                className="navbar-icon-btn navbar-bell"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Icon name="bell" size={18} />
                {unread > 0 && <span className="navbar-bell-dot" aria-hidden="true" />}
              </Link>
              <div className="navbar-drop" ref={dropRef}>
                <button
                  type="button"
                  className="navbar-avatar-btn"
                  onClick={() => setDropOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={dropOpen}
                  aria-label="Account menu"
                >
                  <Avatar name={user.name || user.email || 'User'} size={34} />
                </button>
                {dropOpen && (
                  <div className="navbar-dropdown" role="menu">
                    <Link to="/dashboard" role="menuitem" onClick={() => setDropOpen(false)}>
                      <Icon name="dashboard" size={16} />
                      Dashboard
                    </Link>
                    <Link to="/profile" role="menuitem" onClick={() => setDropOpen(false)}>
                      <Icon name="user" size={16} />
                      Profile
                    </Link>
                    <Link to="/saved" role="menuitem" onClick={() => setDropOpen(false)}>
                      <Icon name="bookmark" size={16} />
                      Saved
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout}>
                      <Icon name="logout" size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-btn navbar-btn--ghost">
                Login
              </Link>
              <Link to="/register" className="navbar-btn navbar-btn--solid">
                Get Started
              </Link>
            </>
          )}

          <button
            type="button"
            className="navbar-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-panel">
          <nav className="navbar-mobile-links" aria-label="Mobile">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `navbar-mobile-link${isActive ? ' navbar-mobile-link--active' : ''}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="navbar-mobile-auth">
            {user ? (
              <>
                <Link to="/notifications" className="navbar-btn navbar-btn--ghost" onClick={closeMenu}>
                  Notifications{unread > 0 ? ` (${unread})` : ''}
                </Link>
                <Link to="/dashboard" className="navbar-btn navbar-btn--ghost" onClick={closeMenu}>
                  Dashboard
                </Link>
                <Link to="/profile" className="navbar-btn navbar-btn--ghost" onClick={closeMenu}>
                  Profile
                </Link>
                <Link to="/saved" className="navbar-btn navbar-btn--ghost" onClick={closeMenu}>
                  Saved
                </Link>
                <button type="button" className="navbar-btn navbar-btn--solid" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-btn navbar-btn--ghost" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="navbar-btn navbar-btn--solid" onClick={closeMenu}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
