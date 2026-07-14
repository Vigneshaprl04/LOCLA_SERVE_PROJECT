import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { FaEnvelope, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'If an account exists for this email, password reset instructions have been sent.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
            Recover Your Password Instantly.
          </h1>
          <p className="auth-branding-text">
            Enter your registered email address, and we will send you secure instructions to reset your password.
          </p>
        </div>

        {/* Floating Abstract Chips */}
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

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-card animate-fade-up">
          <div className="auth-logo-mobile">
            <FaBolt style={{ marginRight: 8 }} /> LocalServe
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Forgot Password</h2>
            <p className="auth-card-subtitle">Recover access to your marketplace account</p>
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

          <form onSubmit={handleSubmit}>
            <div className="auth-form-grid">
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-group">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-control"
                    disabled={loading}
                    required
                  />
                  <span className="input-icon">
                    <FaEnvelope />
                  </span>
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
                  Sending Link...
                </>
              ) : 'Send Reset Instructions'}
            </button>
          </form>

          <p className="auth-footer-text">
            Remembered your password?{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
