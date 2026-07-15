import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaBolt, FaWrench, FaBroom, FaPaintRoller, FaBriefcase, FaMapMarkerAlt, FaCheckCircle } from 'react-icons/fa';

const Register = () => {
  const [categories, setCategories] = useState([]);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',

    category_id: '',
    experience: '',
    description: '',
    working_area: '',
    city: '',
    pincode: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for verification & countdown card
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [emailSent, setEmailSent] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [redirectTimerActive, setRedirectTimerActive] = useState(true);

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  // Redirection countdown effect
  useEffect(() => {
    if (!registrationComplete || !redirectTimerActive) return;
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [registrationComplete, countdown, redirectTimerActive, navigate]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/providers/categories');
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error('Failed to load dynamic categories:', err);
        setCategories([
          { id: 1, name: 'Electrician' },
          { id: 2, name: 'Plumber' },
          { id: 3, name: 'Mechanic' },
          { id: 4, name: 'Carpenter' },
          { id: 5, name: 'Painter' },
          { id: 6, name: 'AC Repair' },
          { id: 7, name: 'Appliance Repair' },
          { id: 8, name: 'Cleaning Service' },
        ]);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResendInSuccess = async () => {
    setRedirectTimerActive(false);
    setResendError('');
    setResendMessage('');
    setResendLoading(true);
    try {
      const res = await api.post('/auth/resend-verification', { email: registeredEmail });
      setResendMessage(res.data.message || 'Verification link sent successfully!');
      setResendCooldown(60);
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (
        form.role === 'provider' &&
        (
          !form.category_id ||
          !form.experience ||
          !form.working_area ||
          !form.city ||
          !form.pincode
        )
      ) {
        throw new Error('Please complete all service specifications.');
      }

      const response = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
        category_id: form.category_id,
        experience: form.experience,
        description: form.description,
        working_area: form.working_area,
        city: form.city,
        pincode: form.pincode
      }, { timeout: 10000 });

      const data = response.data;
      setRegisteredEmail(form.email);
      setEmailSent(data.emailSent !== false);
      setRegistrationComplete(true);
    } catch (err) {
      console.error(err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Server is taking longer than expected. Please try again.');
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          'Registration failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="auth-split-container">
        {/* Left Branding Panel */}
        <div className="auth-branding-panel">
          <div className="decor-shape decor-1"></div>
          <div className="decor-shape decor-2"></div>
          <div className="auth-brand-logo">
            <FaBolt style={{ color: 'var(--accent)' }} />
            LocalServe
          </div>
          <div className="auth-branding-content">
            <h1 className="auth-branding-title">Account Created Successfully!</h1>
            <p className="auth-branding-text">
              Thank you for signing up. Please verify your email to unlock all features of the marketplace.
            </p>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="auth-form-panel" style={{ padding: '40px var(--space-4)' }}>
          <div className="auth-card animate-scale" style={{ maxWidth: '540px', textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div className="success-checkmark-wrapper" style={{ fontSize: '4rem', color: '#10b981', display: 'inline-block', animation: 'scaleIn 0.5s ease-out' }}>
                <FaCheckCircle />
              </div>
            </div>
            
            <h2 className="auth-card-title" style={{ color: '#10b981', marginBottom: '12px' }}>
              Account Created Successfully
            </h2>
            
            <div style={{ margin: '24px 0', padding: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>We&apos;ve sent a verification email to:</p>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{registeredEmail}</strong>
              <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Please verify your email before logging in.
              </p>
            </div>

            {/* If email delivery failed during registration */}
            {!emailSent && (
              <div className="alert alert-warning animate-fade-in" style={{ textAlign: 'left', marginBottom: '20px' }}>
                We couldn&apos;t send the verification email right now. Please use the Resend button below.
              </div>
            )}

            {resendMessage && (
              <div className="alert alert-success animate-fade-in" style={{ textAlign: 'left', marginBottom: '20px' }}>
                {resendMessage}
              </div>
            )}

            {resendError && (
              <div className="alert alert-danger animate-shake" style={{ textAlign: 'left', marginBottom: '20px' }}>
                {resendError}
              </div>
            )}

            <div style={{ marginBottom: '30px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Didn&apos;t receive the email?
              </p>
              <button
                type="button"
                onClick={handleResendInSuccess}
                className="btn-secondary"
                disabled={resendLoading || resendCooldown > 0}
                style={{ minWidth: '200px', padding: '10px 20px' }}
              >
                {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
              {redirectTimerActive ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  <span>Redirecting to Login in {countdown}...</span>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.2)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Auto-redirect paused.</span>
              )}

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '16px' }}
              >
                Go to Login Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-container">
      {/* Left Branding Panel */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaBolt style={{ color: 'var(--accent)' }} />
          LocalServe
        </div>
        
        <div className="auth-branding-content">
          <h1 className="auth-branding-title">
            Join the Premier Local Service Network.
          </h1>
          <p className="auth-branding-text">
            Register to find trusted professionals or grow your independent business. Simple booking, real-time chats, and secure payments.
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

      {/* Right Form Panel */}
      <div className="auth-form-panel" style={{ padding: '40px var(--space-4)' }}>
        <div className="auth-card animate-fade-up" style={{ maxWidth: '540px' }}>
          <div className="auth-logo-mobile">
            <FaBolt style={{ marginRight: 8 }} /> LocalServe
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Create Account</h2>
            <p className="auth-card-subtitle">Sign up to get started as a user or partner</p>
          </header>

          {error && (
            <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              
              {/* Responsive Name and Email row */}
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div className="input-icon-group">
                    <input
                      name="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      className="form-control"
                      disabled={loading}
                      required
                    />
                    <span className="input-icon">
                      <FaUser />
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div className="input-icon-group">
                    <input
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={handleChange}
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

              {/* Phone and password row */}
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="input-icon-group">
                    <input
                      name="phone"
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={handleChange}
                      className="form-control"
                      disabled={loading}
                    />
                    <span className="input-icon">
                      <FaPhone />
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="input-icon-group">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      className="form-control"
                      minLength={6}
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
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Join as role dropdown */}
              <div className="form-group">
                <label className="form-label">Join As</label>
                <div className="input-icon-group">
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="form-control"
                    disabled={loading}
                  >
                    <option value="user">User - Looking for Services</option>
                    <option value="provider">Provider - Offering Services</option>
                  </select>
                  <span className="input-icon">
                    <FaUser />
                  </span>
                </div>
              </div>

              {/* Provider details sub-grid */}
              {form.role === 'provider' && (
                <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: '1px dashed var(--border-color)', paddingBottom: 6, margin: '10px 0 0 0', textAlign: 'left' }}>
                    Service Specifications
                  </h3>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Service Category *</label>
                      <div className="input-icon-group">
                        <select
                          name="category_id"
                          value={form.category_id}
                          onChange={handleChange}
                          className="form-control"
                          disabled={loading}
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <span className="input-icon">
                          <FaBriefcase />
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Experience (Years) *</label>
                      <div className="input-icon-group">
                        <input
                          name="experience"
                          type="number"
                          min="0"
                          placeholder="e.g. 5"
                          value={form.experience}
                          onChange={handleChange}
                          className="form-control"
                          disabled={loading}
                          required
                        />
                        <span className="input-icon">
                          <FaBriefcase />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Service Description</label>
                    <textarea
                      name="description"
                      placeholder="Briefly describe your service expertise and credentials..."
                      value={form.description}
                      onChange={handleChange}
                      rows={2}
                      className="form-control"
                      disabled={loading}
                      style={{ resize: 'none', height: '60px' }}
                    />
                  </div>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Working Area *</label>
                      <div className="input-icon-group">
                        <input
                          name="working_area"
                          placeholder="Locality"
                          value={form.working_area}
                          onChange={handleChange}
                          className="form-control"
                          disabled={loading}
                          required
                        />
                        <span className="input-icon">
                          <FaMapMarkerAlt />
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <div className="input-icon-group">
                        <input
                          name="city"
                          placeholder="City"
                          value={form.city}
                          onChange={handleChange}
                          className="form-control"
                          disabled={loading}
                          required
                        />
                        <span className="input-icon">
                          <FaMapMarkerAlt />
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">PIN Code *</label>
                      <div className="input-icon-group">
                        <input
                          name="pincode"
                          placeholder="639001"
                          value={form.pincode}
                          onChange={handleChange}
                          className="form-control"
                          disabled={loading}
                          required
                          pattern="[0-9]{6}"
                          maxLength={6}
                        />
                        <span className="input-icon">
                          <FaMapMarkerAlt />
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 10 }}
            >
              {loading ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>🌀</span>
                  Creating Account...
                </>
              ) : 'Register'}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;