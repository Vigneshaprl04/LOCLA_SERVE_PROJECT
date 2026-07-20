import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaLock, FaEye, FaEyeSlash, FaCompass, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium ResetPassword screen.
 * Uses Framer Motion transitions and custom glass components.
 */
const ResetPassword = () => {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        password: form.password,
        confirmPassword: form.confirmPassword
      });

      // Redirect to login on success, with location state message
      navigate('/login', {
        state: { message: res.data.message || 'Password reset successful. Please login with your new password.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.');
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
      {/* Left Decorative Branding Pane */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaCompass style={{ fontSize: 24 }} />
          <span>LocalServe</span>
        </div>
        
        <div className="auth-branding-content">
          <h1 className="auth-branding-title">
            Secure Your Account Access.
          </h1>
          <p className="auth-branding-text">
            Choose a strong password containing at least 8 characters, numbers, and special symbols to safeguard your identity.
          </p>
        </div>

        {/* Floating Icons */}
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

      {/* Right Form Pane */}
      <div className="auth-form-panel">
        <motion.div 
          className="auth-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="auth-logo-mobile">
            <FaCompass style={{ fontSize: 24 }} />
            <span>LocalServe</span>
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-subtitle">Set a strong new password for your account</p>
          </header>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {!token ? (
            <div className="alert alert-danger" style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <span>Reset token is missing from the URL. Please request a new reset link.</span>
              <GlassButton
                onClick={() => navigate('/forgot-password')}
                variant="outline"
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              >
                Request Reset Link
              </GlassButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="auth-form-grid">
                
                {/* New Password */}
                <div className="form-group">
                  <label className="form-label">New Password</label>
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

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="input-icon-group">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="form-control"
                      disabled={loading}
                      required
                    />
                    <span className="input-icon">
                      <FaLock />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="input-action-icon"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

              </div>

              {loading ? (
                <div style={{ padding: '16px 0' }}>
                  <Loader size={40} text="Resetting your password..." />
                </div>
              ) : (
                <GlassButton
                  type="submit"
                  variant="primary"
                  style={{ width: '100%', marginTop: 16 }}
                  disabled={loading}
                >
                  Reset Password
                </GlassButton>
              )}
            </form>
          )}

          <p className="auth-footer-text">
            Back to{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ResetPassword;
