import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaBolt, FaWrench, FaBroom, FaPaintRoller, FaBriefcase, FaMapMarkerAlt } from 'react-icons/fa';

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

  const { register, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      });

      if (form.role === 'provider') {
        await login(form.email, form.password);

        await api.put('/providers/profile', {
          category_id: Number(form.category_id),
          experience: Number(form.experience),
          description: form.description,
          working_area: form.working_area,
          city: form.city,
          pincode: form.pincode,
        });

        logout();

        setSuccess('Partner registration completed. Admin review is pending.');
      } else {
        setSuccess('Account created successfully. Please login.');
      }

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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