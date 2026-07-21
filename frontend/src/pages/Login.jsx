import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCompass, FaWrench, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * 3D Cartoon Smart City Premium Login redesign.
 * Combines SVG vector landscapes, CSS keyframe loops, and mouse parallax effects.
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
      className="cartoon-city-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pixar-style Sky Elements */}
      <div className="sky-canvas">
        <div className="sun-glow" />
        <div className="cloud-sprite cloud-1" />
        <div className="cloud-sprite cloud-2" />
        <div className="cloud-sprite cloud-3" />
        
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

      {/* Floating Sparkles & Sparkly Particles */}
      <div className="sparkle-layer">
        <div className="sparkle sp-1" />
        <div className="sparkle sp-2" />
        <div className="sparkle sp-3" />
        <div className="sparkle leaf-1" />
        <div className="sparkle leaf-2" />
      </div>

      <div className="split-view-wrapper">
        {/* Left Side: Large Pixar-Quality Illustration Panel */}
        <div className="illustration-panel">
          <div className="illustration-container">
            <svg viewBox="0 0 500 400" className="cartoon-svg-scene">
              <defs>
                <linearGradient id="roofGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#fef9c3" />
                </linearGradient>
                <linearGradient id="vanGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="gardenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* The Cozy House */}
              <polygon points="120,120 280,120 200,60" fill="url(#roofGrad)" />
              <rect x="135" y="120" width="130" height="130" rx="10" fill="url(#wallGrad)" />
              
              {/* Door & Windows */}
              <rect x="185" y="190" width="30" height="60" rx="3" fill="#854d0e" />
              <circle cx="210" cy="220" r="2.5" fill="#f59e0b" />
              <rect x="150" y="140" width="30" height="30" rx="4" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
              <rect x="220" y="140" width="30" height="30" rx="4" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />

              {/* Garden Green ground */}
              <rect x="20" y="240" width="460" height="120" rx="20" fill="url(#gardenGrad)" />

              {/* Service Van Parked */}
              <g className="cartoon-van-group">
                <rect x="290" y="210" width="110" height="50" rx="8" fill="url(#vanGrad)" />
                <rect x="370" y="215" width="35" height="25" rx="4" fill="#bae6fd" />
                <circle cx="320" cy="265" r="14" fill="#1e293b" />
                <circle cx="320" cy="265" r="6" fill="#cbd5e1" />
                <circle cx="380" cy="265" r="14" fill="#1e293b" />
                <circle cx="380" cy="265" r="6" fill="#cbd5e1" />
                <text x="300" y="240" fill="#ffffff" fontSize="9" fontWeight="bold">LocalServe</text>
              </g>

              {/* Happy Characters */}
              {/* Plumber fixing the outdoor tap */}
              <g className="character plumber-guy">
                <circle cx="70" cy="220" r="14" fill="#fed7aa" />
                <rect x="58" y="234" width="24" height="40" rx="6" fill="#ef4444" />
                <rect x="55" y="245" width="30" height="8" rx="2" fill="#1e3a8a" />
                {/* Wrench */}
                <line x1="80" y1="230" x2="90" y2="220" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* Electrician fixing house lights */}
              <g className="character electrician-guy">
                <circle cx="270" cy="110" r="12" fill="#fed7aa" />
                <rect x="260" y="122" width="20" height="35" rx="5" fill="#eab308" />
                {/* Wire lasso */}
                <path d="M 280 130 Q 295 125 290 140" fill="none" stroke="#22c55e" strokeWidth="2.5" />
              </g>

              {/* Cleaner waving hello */}
              <g className="character cleaner-waving">
                <circle cx="215" cy="165" r="10" fill="#fed7aa" />
                <rect x="207" y="175" width="16" height="30" rx="4" fill="#06b6d4" />
                {/* arm waving */}
                <path d="M 223 180 Q 235 170 230 160" fill="none" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" />
              </g>

              {/* Smiling Family in front of Door */}
              <g className="character-family">
                {/* Dad */}
                <circle cx="170" cy="190" r="10" fill="#fdba74" />
                <rect x="162" y="200" width="16" height="35" rx="4" fill="#3b82f6" />
                {/* Mom */}
                <circle cx="185" cy="195" r="9" fill="#fdba74" />
                <rect x="178" y="204" width="14" height="30" rx="4" fill="#ec4899" />
                {/* Child */}
                <circle cx="198" cy="210" r="7" fill="#fdba74" />
                <rect x="193" y="217" width="10" height="18" rx="3" fill="#22c55e" />
              </g>
            </svg>
          </div>
          <div className="scrolling-road">
            <div className="mini-van" />
          </div>
        </div>

        {/* Right Side: Redesigned Glassmorphic Login Card */}
        <div className="login-card-panel">
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

            {/* Redesigned Form */}
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
    </div>
  );
};

export default Login;
