import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCompass, FaWrench, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Import local background illustration asset
import loginBackground from '../assets/images/login-bg.png';

/**
 * 3D Cartoon Smart City Premium Full-Screen Background Login redesign.
 * Applies the compressed local background image with a soft dark overlay and 3D floating sparks/balloon loops.
 */
const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
  
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || '');
  
  // Unverified account states
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Mouse Parallax coordinates for 3D card tilt
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = (clientX / width - 0.5) * 12; // -6 to +6 degrees
    const y = (clientY / height - 0.5) * -12; // -6 to +6 degrees
    setParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    setResendError('');
    setResendMessage('');
    setResendLoading(true);
    try {
      const res = await api.post('/auth/resend-verification', { email: unverifiedEmail });
      setResendMessage(res.data.message || 'Verification link sent successfully!');
      setResendCooldown(60);
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend verification link.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsUnverified(false);
    setLoading(true);

    try {
      const loggedInUser = await login(
        form.email,
        form.password
      );

      if (loggedInUser.role === 'user') {
        navigate('/user/home');
      } else if (loggedInUser.role === 'provider') {
        navigate('/provider/dashboard');
      } else if (loggedInUser.role === 'admin') {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 && err.response?.data?.message?.toLowerCase().includes('verify')) {
        setIsUnverified(true);
        setUnverifiedEmail(form.email);
      } else {
        setError(
          err.response?.data?.message || 'Login failed. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="cartoon-bg-login-container"
      style={{
        backgroundImage: `url(${loginBackground})`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Soft Dark Overlay to enhance text contrast */}
      <div className="dark-overlay" />

      {/* Floating 3D/Cartoon Canvas Elements on top of background */}
      <div className="sky-canvas">
        <div className="sun-glow" />
        
        {/* Hot Air Balloon */}
        <div className="hot-air-balloon">
          <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
            <ellipse cx="20" cy="20" rx="16" ry="20" fill="#ec4899" />
            <path d="M12 36 L15 48 H25 L28 36 Z" fill="#f59e0b" />
            <rect x="17" y="48" width="6" height="6" rx="1" fill="#78350f" />
            <line x1="12" y1="36" x2="17" y2="48" stroke="#ffffff" strokeWidth="1" />
            <line x1="28" y1="36" x2="23" y2="48" stroke="#ffffff" strokeWidth="1" />
          </svg>
        </div>

        {/* Flying Birds */}
        <div className="bird-group">
          <div className="bird bird-1" />
          <div className="bird bird-2" />
        </div>
      </div>

      {/* Sparkles Layer */}
      <div className="sparkle-layer">
        <div className="sparkle sp-1" />
        <div className="sparkle sp-2" />
        <div className="sparkle sp-3" />
        <div className="sparkle leaf-1" />
        <div className="sparkle leaf-2" />
      </div>

      {/* Centered Glassmorphic Login Card */}
      <div className="centered-card-wrapper">
        <motion.div 
          className={`premium-login-card ${loading ? 'loading-bounce' : ''}`}
          style={{
            transform: `perspective(1000px) rotateX(${parallax.y}deg) rotateY(${parallax.x}deg) translateY(${parallax.x * 0.25}px)`
          }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Header */}
          <header className="premium-header">
            <h2 className="premium-title">👋 Welcome Back</h2>
            <p className="premium-subtitle">Find trusted local professionals in minutes.</p>
          </header>

          {message && (
            <div className="alert alert-success animate-fade-in" style={{ marginBottom: 20 }}>
              {message}
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {isUnverified && (
            <div className="alert alert-danger" style={{ marginBottom: 20, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem', textAlign: 'left' }}>
                Your account email is unverified. Please check your inbox or request a new verification link below.
              </p>
              {resendMessage && (
                <p style={{ margin: 0, color: '#86efac', fontSize: '0.85rem', textAlign: 'left' }}>
                  {resendMessage}
                </p>
              )}
              {resendError && (
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem', textAlign: 'left' }}>
                  {resendError}
                </p>
              )}
              <GlassButton
                onClick={handleResendVerification}
                variant="secondary"
                disabled={resendLoading || resendCooldown > 0}
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
              >
                {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Link'}
              </GlassButton>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="pill-form-grid">
              
              {/* Email Input Field */}
              <div className={`pill-input-wrapper ${isFocused.email || form.email ? 'field-active' : ''}`}>
                <label className="pill-label">Email Address</label>
                <div className="pill-input-inner">
                  <span className="pill-icon">
                    <FaUser />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setIsFocused({ ...isFocused, email: true })}
                    onBlur={() => setIsFocused({ ...isFocused, email: false })}
                    placeholder=""
                    className="pill-control"
                    disabled={loading}
                    required
                    aria-label="Email Address"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div className={`pill-input-wrapper ${isFocused.password || form.password ? 'field-active' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <label className="pill-label">Password</label>
                  <Link to="/forgot-password" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', marginRight: 14, zIndex: 10 }}>
                    Forgot?
                  </Link>
                </div>
                <div className="pill-input-inner">
                  <span className="pill-icon">
                    <FaLock />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setIsFocused({ ...isFocused, password: true })}
                    onBlur={() => setIsFocused({ ...isFocused, password: false })}
                    placeholder=""
                    className="pill-control"
                    disabled={loading}
                    required
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pill-action-icon"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

            </div>

            {loading ? (
              <div className="rotating-gear-loading">
                <FaWrench className="gear-spin" size={32} />
                <span style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: 700 }}>Locating credentials...</span>
              </div>
            ) : (
              <button
                type="submit"
                className="pixar-btn"
                disabled={loading}
              >
                Sign In
              </button>
            )}
          </form>

          {/* Footer */}
          <p className="pixar-footer-text">
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 800, color: '#7c3aed' }}>
              Register Now
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
