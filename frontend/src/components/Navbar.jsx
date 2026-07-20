import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';
import { FaSignOutAlt, FaCompass, FaBars, FaTimes, FaUserAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium glassmorphic navigation header.
 * Uses Framer Motion for responsive mobile toggle menus.
 */
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
            <FaCompass size={22} />
            <span>LocalServe</span>
          </Link>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button 
            className="navbar-mobile-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              color: "var(--text-main)",
              fontSize: "20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px"
            }}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>

          {/* Desktop Navigation Links */}
          <ul className="navbar-links">
            {user.role === 'user' && (
              <>
                <li>
                  <Link
                    to="/user/home"
                    className={`navbar-link ${location.pathname === '/user/home' ? 'active' : ''}`}
                  >
                    Find Services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/bookings"
                    className={`navbar-link ${location.pathname === '/user/bookings' ? 'active' : ''}`}
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
                  >
                    Admin Panels
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Desktop Actions Panel */}
          <div className="navbar-actions" style={{ display: 'flex' }}>
            <NotificationBell />

            <div 
              onClick={handleProfileClick} 
              className="navbar-avatar" 
              title="My Profile"
            >
              {getInitials(user.name)}
            </div>

            <button
              onClick={handleLogout}
              className="btn-outline"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="Logout"
            >
              <FaSignOutAlt size={13} />
              <span className="navbar-logout-text">Logout</span>
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Slide-Down Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: "80px",
              left: 0,
              right: 0,
              background: "rgba(10, 15, 30, 0.95)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              borderBottom: "1px solid var(--glass-border)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              padding: "24px 16px",
              zIndex: 49,
              overflow: "hidden",
              boxSizing: "border-box"
            }}
          >
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
              {user.role === 'user' && (
                <>
                  <li>
                    <Link
                      to="/user/home"
                      style={{ color: "var(--text-main)", fontSize: "1.1rem", fontWeight: "600", display: "block" }}
                      onClick={() => setMenuOpen(false)}
                    >
                      Find Services
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/user/bookings"
                      style={{ color: "var(--text-main)", fontSize: "1.1rem", fontWeight: "600", display: "block" }}
                      onClick={() => setMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                  </li>
                </>
              )}

              {user.role === 'provider' && (
                <li>
                  <Link
                    to="/provider/dashboard"
                    style={{ color: "var(--text-main)", fontSize: "1.1rem", fontWeight: "600", display: "block" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
              )}

              {user.role === 'admin' && (
                <li>
                  <Link
                    to="/admin/dashboard"
                    style={{ color: "var(--text-main)", fontSize: "1.1rem", fontWeight: "600", display: "block" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Panels
                  </Link>
                </li>
              )}

              <li style={{ borderTop: "1px solid var(--glass-border)", marginTop: "8px", paddingTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Notifications:</span>
                  <NotificationBell />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button 
                    onClick={handleProfileClick} 
                    className="btn-outline" 
                    style={{ width: "100%", padding: "12px", justifyContent: "center", color: "var(--text-main)", background: "rgba(255, 255, 255, 0.03)", borderColor: "var(--glass-border)" }}
                  >
                    <FaUserAlt size={13} style={{ marginRight: 8 }} /> Profile Settings
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="btn-danger" 
                    style={{ width: "100%", padding: "12px", justifyContent: "center", color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                  >
                    <FaSignOutAlt size={13} style={{ marginRight: 8 }} /> Logout
                  </button>
                </div>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 767px) {
          .navbar-actions {
            display: none !important;
          }
          .navbar-links {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Navbar;
