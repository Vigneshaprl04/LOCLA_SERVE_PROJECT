import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

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
    <div className="auth-split-container">
      {/* Left Decorative Branding Panel */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaBolt style={{ color: 'var(--accent)' }} />
          LocalServe
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
          <div className="floating-service-chip chip-1 animate-float-slow-1">
            <FaBolt style={{ color: '#fbbf24' }} /> Electrician
          </div>
          <div className="floating-service-chip chip-2 animate-float-slow-2">
            <FaWrench style={{ color: '#60a5fa' }} /> Plumber
          </div>
          <div className="floating-service-chip chip-3 animate-float-slow-1">
            <FaBroom style={{ color: '#34d399' }} /> Cleaning
          </div>
          <div className="floating-service-chip chip-4 animate-float-slow-2">
            <FaPaintRoller style={{ color: '#f472b6' }} /> Painter
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 5, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          © 2026 LocalServe Marketplace. All rights reserved.
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-card animate-fade-up">
          {/* Logo only shown on mobile screen sizes */}
          <div className="auth-logo-mobile">
            <FaBolt style={{ marginRight: 8 }} /> LocalServe
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
            <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {isUnverified && (
            <div className="alert alert-warning animate-fade-in" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong style={{ display: 'block', marginBottom: 6, color: '#d97706' }}>Your account isn&apos;t verified yet.</strong>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Check your inbox at <strong>{unverifiedEmail}</strong> or click below to receive a new link.
              </p>
              
              {resendMessage && (
                <div className="alert alert-success animate-fade-in" style={{ padding: '8px 12px', fontSize: '0.85rem', marginBottom: 10 }}>
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div className="alert alert-danger animate-shake" style={{ padding: '8px 12px', fontSize: '0.85rem', marginBottom: 10 }}>
                  {resendError}
                </div>
              )}

              <button
                type="button"
                onClick={handleResendVerification}
                className="btn-secondary"
                disabled={resendLoading || resendCooldown > 0}
                style={{ width: '100%', padding: '8px 16px', fontSize: '0.9rem' }}
              >
                {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>
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
                  <Link to="/forgot-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
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

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 10 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>🌀</span>
                  Signing In...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700 }}>
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
