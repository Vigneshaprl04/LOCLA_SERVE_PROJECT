import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium UserProfile screen.
 * Integrates profile details, street address editor, and auth syncs.
 */
const UserProfile = () => {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    area: '',
    city: '',
    pincode: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/auth/profile');
        const userData = response.data.user;
        if (userData) {
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            area: userData.area || '',
            city: userData.city || '',
            pincode: userData.pincode || ''
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.put('/auth/profile', formData);

      // Sync AuthContext so header updates immediately
      updateUserContext({
        name: formData.name,
        email: formData.email
      });

      setSuccess('Profile updated successfully!');
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This email is already in use by another account');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/user/home');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Opening profile configurations..." />
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <motion.div 
      style={{ maxWidth: '800px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header title */}
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
        <GlassButton onClick={handleCancel} variant="outline" style={{ padding: 8, border: 'none', background: 'transparent' }} title="Back">
          <FaArrowLeft size={16} />
        </GlassButton>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.0rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            My Profile
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>View and update your personal details</p>
        </div>
      </header>

      {/* Main card wrapper */}
      <main>
        <GlassCard hoverLift={false} style={{ padding: 36 }}>
          
          {/* Avatar badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 12 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 0 15px rgba(124, 58, 237, 0.2)' }}>
              {getInitials(formData.name)}
            </div>
            <span className="badge badge-accent" style={{ fontSize: 11 }}>
              CUSTOMER ACCOUNT
            </span>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              {success}
            </div>
          )}

          {/* Profile details form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Role (Locked)</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={user?.role || 'user'}
                    className="form-control"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', paddingRight: '36px' }}
                    disabled
                  />
                  <FaLock style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', opacity: 0.6 }} />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Street Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  maxLength={250}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Area / Locality</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={10}
                />
              </div>

            </div>

            {/* Action Button Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 10,
                borderTop: '1px solid var(--glass-border)',
                paddingTop: 24
              }}
            >
              <GlassButton
                type="button"
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                variant="primary"
                disabled={saving}
              >
                Save Changes
              </GlassButton>
            </div>

          </form>

        </GlassCard>
      </main>

      <style>{`
        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default UserProfile;
