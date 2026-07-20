import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaArrowLeft, FaStar, FaMapMarkerAlt, FaBriefcase, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import { useProviderPresence } from '../hooks/useProviderPresence';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Redesigned Premium ProviderDetails screen.
 * Uses Framer Motion transitions and custom glass components.
 */
const ProviderDetails = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [form, setForm] = useState({
    service_description: '',
    service_address: '',
    preferred_date: '',
    emergency_booking: false,
  });

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isOnline = useProviderPresence(providerId, provider?.availability_status);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setLoading(true);
        setError('');

        const [providerResponse, reviewsResponse] = await Promise.all([
          api.get(`/providers/${providerId}`),
          api.get(`/reviews/provider/${providerId}`),
        ]);

        setProvider(providerResponse.data.provider);
        setReviews(reviewsResponse.data.reviews || []);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Unable to load provider details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const createBooking = async (e) => {
    e.preventDefault();

    try {
      setBookingLoading(true);
      setError('');
      setMessage('');

      if (!provider) {
        return;
      }

      const response = await api.post('/bookings', {
        provider_id: provider.provider_id,
        category_id: provider.category_id,
        service_description: form.service_description,
        service_address: form.service_address,
        preferred_date: form.preferred_date || null,
        emergency_booking: form.emergency_booking,
      });

      setMessage(
        `Booking created successfully. Booking ID: ${response.data.bookingId}`
      );

      setForm({
        service_description: '',
        service_address: '',
        preferred_date: '',
        emergency_booking: false,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Loading service specialist profile..." />
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>
        <GlassButton onClick={() => navigate('/user/home')} variant="outline">
          Back to Providers
        </GlassButton>
      </div>
    );
  }

  return (
    <motion.div 
      style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      {/* Header Back Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
        <GlassButton onClick={() => navigate('/user/home')} variant="outline" style={{ padding: '8px 16px' }}>
          <FaArrowLeft /> Back to Providers
        </GlassButton>
      </div>

      {/* Main Details Grid */}
      <div className="provider-details-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Left Side: Profile Details & Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Profile Card */}
          <GlassCard style={{ textAlign: 'left', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {provider.name}
                </h1>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-accent)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {provider.category_name} Specialist
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={isOnline ? 'badge badge-success' : 'badge badge-danger'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FaStar /> {Number(provider.average_rating || 0).toFixed(1)}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaBriefcase style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Experience:</strong> {provider.experience} Years active practice
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaMapMarkerAlt style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Coverage:</strong> {provider.working_area}, {provider.city}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>About the Specialist</strong>
                <p style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-muted)', lineHeight: '1.55' }}>
                  {provider.description || 'This provider has not published any descriptive details yet.'}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Customer Reviews Section */}
          <GlassCard style={{ textAlign: 'left', padding: 32 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 20, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Reviews & Testimonials</h2>

            {reviews.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-light)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>No reviews published yet for this provider.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      borderBottom: '1px solid var(--glass-border)',
                      paddingBottom: 20,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{review.customer_name}</strong>
                      <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaStar size={10} /> {review.rating} Star
                      </span>
                    </div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {review.comment}
                    </p>
                    <small style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Side: Appointment Booking Wizard Panel */}
        <div style={{ position: 'sticky', top: '104px' }}>
          <GlassCard style={{ textAlign: 'left', padding: 32 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 6, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Book Service Appointment</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>Provide description and location for scheduling</p>

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

            <form onSubmit={createBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label">Service Requirement Details *</label>
                <textarea
                  name="service_description"
                  placeholder="Describe your job details e.g. Kitchen tap leaking, living room ceiling fan installation..."
                  value={form.service_description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="form-control"
                  style={{ resize: 'none', minHeight: '90px' }}
                  disabled={bookingLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Service Address *</label>
                <textarea
                  name="service_address"
                  placeholder="Enter full physical location address..."
                  value={form.service_address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="form-control"
                  style={{ resize: 'none', minHeight: '70px' }}
                  disabled={bookingLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <div className="input-icon-group">
                  <input
                    type="date"
                    name="preferred_date"
                    value={form.preferred_date}
                    onChange={handleChange}
                    className="form-control"
                    disabled={bookingLoading}
                  />
                  <span className="input-icon">
                    <FaCalendarAlt />
                  </span>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: '12px 16px', 
                background: form.emergency_booking ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid',
                borderColor: form.emergency_booking ? 'rgba(239, 68, 68, 0.25)' : 'var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                marginTop: 4,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setForm(f => ({ ...f, emergency_booking: !f.emergency_booking }))}
              >
                <input
                  type="checkbox"
                  name="emergency_booking"
                  checked={form.emergency_booking}
                  onChange={handleChange}
                  style={{ cursor: 'pointer', accentColor: 'var(--error)' }}
                  disabled={bookingLoading}
                  onClick={(e) => e.stopPropagation()}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: form.emergency_booking ? '#fca5a5' : 'var(--text-main)' }}>
                    Emergency Request
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Requires immediate dispatch. Additional fees may apply.
                  </span>
                </div>
              </div>

              {bookingLoading ? (
                <div style={{ padding: '12px 0' }}>
                  <Loader size={45} text="Registering appointment booking..." />
                </div>
              ) : (
                <GlassButton
                  type="submit"
                  variant={form.emergency_booking ? "danger" : "primary"}
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={bookingLoading}
                >
                  {form.emergency_booking ? 'Request Emergency Dispatch' : 'Book Appointment'}
                </GlassButton>
              )}
            </form>
          </GlassCard>
        </div>

      </div>

    </motion.div>
  );
};

export default ProviderDetails;
