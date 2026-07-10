import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
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

          {error && (
            <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
              {error}
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
                <label className="form-label">Password</label>
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
