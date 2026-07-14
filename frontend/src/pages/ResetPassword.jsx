import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { FaLock, FaEye, FaEyeSlash, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

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
    <div className="auth-split-container">
      {/* Left Branding Pane */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaBolt style={{ color: 'var(--accent)' }} />
          LocalServe
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

      {/* Right Form Pane */}
      <div className="auth-form-panel">
        <div className="auth-card animate-fade-up">
          <div className="auth-logo-mobile">
            <FaBolt style={{ marginRight: 8 }} /> LocalServe
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-subtitle">Set a strong new password for your account</p>
          </header>

          {error && (
            <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {!token ? (
            <div className="alert alert-danger" style={{ textAlign: 'left' }}>
              Reset token is missing from the URL. Please request a new reset link.
              <div style={{ marginTop: 15 }}>
                <Link to="/forgot-password" className="btn btn-outline" style={{ display: 'inline-block', fontSize: '0.8rem' }}>
                  Request Reset Link
                </Link>
              </div>
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

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: 20 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>🌀</span>
                    Resetting Password...
                  </>
                ) : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="auth-footer-text">
            Back to{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
