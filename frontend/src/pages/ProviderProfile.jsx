import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaLock, FaArrowLeft, FaCheck, FaTimes, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import api from '../api';
import NotificationBell from '../components/NotificationBell';

const CATEGORIES = [
  { id: 1, name: 'Electrician' },
  { id: 2, name: 'Plumber' },
  { id: 3, name: 'Mechanic' },
  { id: 4, name: 'Carpenter' },
  { id: 5, name: 'Painter' },
  { id: 6, name: 'AC Repair' },
  { id: 7, name: 'Appliance Repair' },
  { id: 8, name: 'Cleaning Service' }
];

const ProviderProfile = () => {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category_id: '',
    experience: 0,
    description: '',
    working_area: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: ''
  });
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [averageRating, setAverageRating] = useState('0.00');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await api.get('/providers/profile');
        const providerData = response.data.provider;
        
        if (providerData) {
          setFormData({
            name: providerData.name || '',
            email: providerData.email || '',
            phone: providerData.phone || '',
            category_id: providerData.category_id || '',
            experience: providerData.experience || 0,
            description: providerData.description || '',
            working_area: providerData.working_area || '',
            city: providerData.city || '',
            pincode: providerData.pincode || '',
            latitude: providerData.latitude || '',
            longitude: providerData.longitude || ''
          });
          setVerificationStatus(providerData.verification_status || 'pending');
          setAverageRating(providerData.average_rating || '0.00');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load provider profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experience' || name === 'category_id' ? (value ? Number(value) : '') : value
    }));
  };

  const handleGetLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocationMessage('Getting coordinates...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setLocationMessage(`Coordinates fetched: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      (err) => {
        console.error('Location Error:', err);
        setError('Location permission denied or unable to retrieve location details.');
        setLocationMessage('');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

      // Execute both user profile and provider profile updates
      await Promise.all([
        api.put('/auth/profile', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }),
        api.put('/providers/profile', {
          category_id: formData.category_id || null,
          experience: formData.experience,
          description: formData.description,
          working_area: formData.working_area,
          city: formData.city,
          pincode: formData.pincode,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null
        })
      ]);

      // Sync identity info to AuthContext
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
    navigate('/provider/dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-muted)' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading provider profile...</p>
      </div>
    );
  }

  // Get initials for profile avatar card
  const getInitials = (name) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      {/* Header title */}
      <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleCancel} className="btn-outline" style={{ padding: 8, border: 'none', background: 'transparent', outline: 'none' }} title="Back">
          <FaArrowLeft size={16} />
        </button>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Provider Profile</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Manage your services, details, and geolocation coverage</p>
        </div>
      </header>

      {/* Main card wrapper */}
      <main className="card animated-fade-up">
        
        {/* Avatar header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--secondary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)' }}>
              {getInitials(formData.name)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{formData.name || 'Partner Profile'}</h2>
              <span className="badge badge-accent" style={{ fontSize: 10, marginTop: 4 }}>
                ROLE: PROVIDER
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <span className={`badge ${
              verificationStatus === 'verified' ? 'badge-success' :
              verificationStatus === 'rejected' ? 'badge-danger' : 'badge-warning'
            }`}>
              Verification: {verificationStatus.toUpperCase()}
            </span>
            <span className="badge badge-warning">
              <FaStar style={{ marginRight: 4 }} /> {Number(averageRating).toFixed(1)} Rating
            </span>
          </div>
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

        {/* Profile Details Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Section 1: Credentials */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 14px 0', borderBottom: '1px dashed var(--border)', paddingBottom: 6, textAlign: 'left' }}>
              Personal Credentials
            </h3>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Business Name / Full Name *</label>
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
                <label className="form-label">Verification Status (Locked)</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={verificationStatus}
                    className="form-control"
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', paddingRight: '36px' }}
                    disabled
                  />
                  <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Service Specifications */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 14px 0', borderBottom: '1px dashed var(--border)', paddingBottom: 6, textAlign: 'left' }}>
              Service Specifications
            </h3>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Service Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Experience (Years)</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="form-control"
                  min="0"
                  max="99"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Service Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-control"
                  style={{ height: '70px', resize: 'none' }}
                  maxLength={500}
                  placeholder="Brief description of the service and repair work you offer..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Working Area Coverage</label>
                <input
                  type="text"
                  name="working_area"
                  value={formData.working_area}
                  onChange={handleChange}
                  className="form-control"
                  maxLength={150}
                  placeholder="e.g. Locality names, main roads"
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
          </div>

          {/* Section 3: Geolocation Coordinates */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 14px 0', borderBottom: '1px dashed var(--border)', paddingBottom: 6, textAlign: 'left' }}>
              Geolocation Coordinates
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={formData.latitude}
                      className="form-control"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', paddingRight: '36px' }}
                      placeholder="Not set"
                      disabled
                    />
                    <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={formData.longitude}
                      className="form-control"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', paddingRight: '36px' }}
                      placeholder="Not set"
                      disabled
                    />
                    <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="btn-outline"
                  style={{ color: 'var(--accent)', borderColor: 'var(--accent)', padding: '8px 14px', fontSize: 13 }}
                >
                  <FaMapMarkerAlt style={{ marginRight: 6 }} /> Get Browser Location
                </button>
                {locationMessage && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>
                    {locationMessage}
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Action buttons footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 10,
              borderTop: '1px solid var(--border)',
              paddingTop: 20
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              className="btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </main>

      {/* Responsive column override style */}
      <style>{`
        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProviderProfile;
