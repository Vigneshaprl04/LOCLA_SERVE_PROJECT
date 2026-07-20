import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCompass, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium Login screen.
 * Uses Framer Motion transitions and custom glass components.
 */
const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    <motion.div 
      className="auth-split-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left Decorative Branding Panel */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaCompass style={{ fontSize: 24 }} />
          <span>LocalServe</span>
        </div>
        
        <div className="auth-branding-content">
          <h1 className="auth-branding-title">
            Trusted Local Services, Right When You Need Them.
          </h1>
          <p className="auth-branding-text">
            Connect instantly with verified local plumbers, electricians, mechanics, and painters. Fast, secure, and hassle-free.
          </p>
        </div>

        {/* Floating Abstract Cards */}
        <div className="auth-floating-cards">
          <div className="floating-service-chip chip-1">
            <FaBolt style={{ color: '#fbbf24' }} /> Electrician
          </div>
          <div className="floating-service-chip chip-2">
            <FaWrench style={{ color: '#60a5fa' }} /> Plumber
          </div>
          <div className="floating-service-chip chip-3">
            <FaBroom style={{ color: '#34d399' }} /> Cleaning
          </div>
          <div className="floating-service-chip chip-4">
            <FaPaintRoller style={{ color: '#f472b6' }} /> Painter
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 5, fontSize: '0.85rem', color: 'var(--text-light)' }}>
          © 2026 LocalServe Marketplace. All rights reserved.
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="auth-form-panel">
        <motion.div 
          className="auth-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {/* Logo only shown on mobile screen sizes */}
          <div className="auth-logo-mobile">
            <FaCompass style={{ fontSize: 24 }} />
            <span>LocalServe</span>
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Welcome Back</h2>
            <p className="auth-card-subtitle">Enter your credentials to manage services</p>
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

          <form onSubmit={handleSubmit}>
            <div className="auth-form-grid">
              
              {/* Email Control */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-group">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="form-control"
                    disabled={loading}
                    required
                  />
                  <span className="input-icon">
                    <FaEnvelope />
                  </span>
                </div>
              </div>

              {/* Password Control */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Password</label>
                  <Link to="/forgot-password" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--accent)' }}>
                    Forgot Password?
                  </Link>
                </div>
                <div className="input-icon-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="form-control"
                    disabled={loading}
                    required
                  />
                  <span className="input-icon">
                    <FaLock />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-action-icon"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

            </div>

            {loading ? (
              <div style={{ padding: '20px 0' }}>
                <Loader size={40} text="Signing you in safely..." />
              </div>
            ) : (
              <GlassButton
                type="submit"
                variant="primary"
                style={{ width: '100%', marginTop: 16 }}
                disabled={loading}
              >
                Sign In
              </GlassButton>
            )}
          </form>

          <p className="auth-footer-text">
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Register Now
            </Link>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;
