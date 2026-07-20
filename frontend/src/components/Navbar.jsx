import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';
import { FaSignOutAlt, FaCompass, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    if (user.role === 'user') {
      navigate('/user/profile');
    } else if (user.role === 'provider') {
      navigate('/provider/profile');
    }
  };

  return (
    <div className="navbar-sticky-wrapper">
      <nav className="navbar">
        <div className="navbar-container">
          
          {/* Logo Branding */}
          <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
            <FaCompass style={{ fontSize: 20 }} />
            <span>LocalServe</span>
          </Link>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button 
            className="navbar-mobile-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>

          {/* Navigation Links list */}
          <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            {user.role === 'user' && (
              <>
                <li>
                  <Link
                    to="/user/home"
                    className={`navbar-link ${location.pathname === '/user/home' ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Find Services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/bookings"
                    className={`navbar-link ${location.pathname === '/user/bookings' ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                </li>
              </>
            )}

            {user.role === 'provider' && (
              <>
                <li>
                  <Link
                    to="/provider/dashboard"
                    className={`navbar-link ${location.pathname === '/provider/dashboard' ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <li>
                  <Link
                    to="/admin/dashboard"
                    className={`navbar-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Panels
                  </Link>
                </li>
              </>
            )}
            
            {/* Mobile-only profile & logout links */}
            {menuOpen && (
              <li style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', color: 'var(--text-main)' }}>
                  <span>Notifications:</span>
                  <NotificationBell />
                </div>
                <button onClick={handleProfileClick} className="btn-outline" style={{ width: '100%' }}>
                  Profile Settings
                </button>
                <button onClick={handleLogout} className="btn-danger" style={{ width: '100%' }}>
                  Logout
                </button>
              </li>
            )}
          </ul>

          {/* Actions panel (hidden on mobile menu open since it folds inside menu) */}
          <div className="navbar-actions" style={{ display: menuOpen ? 'none' : 'flex' }}>
            <NotificationBell />

            <div onClick={handleProfileClick} className="navbar-avatar" title="My Profile">
              {getInitials(user.name)}
            </div>

            <button
              onClick={handleLogout}
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              title="Logout"
            >
              <FaSignOutAlt size={13} />
              <span className="navbar-logout-text">Logout</span>
            </button>
          </div>

        </div>
      </nav>

      {/* Javascript styles for responsive toggle menu handling */}
      <style>{`
        @media (max-width: 767px) {
          .navbar-links {
            display: none;
            position: absolute;
            top: 72px;
            left: 0;
            right: 0;
            background-color: #ffffff;
            border-bottom: 1px solid var(--border-color);
            padding: var(--space-6) var(--space-4);
            flex-direction: column;
            gap: 16px;
            box-shadow: var(--shadow-lg);
            z-index: 40;
            list-style: none;
          }
          .navbar-links.open {
            display: flex;
          }
          .navbar-logout-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Navbar;
