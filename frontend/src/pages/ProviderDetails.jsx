import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { FaArrowLeft, FaStar, FaMapMarkerAlt, FaBriefcase, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import { useProviderPresence } from '../hooks/useProviderPresence';

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-muted)' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading provider details...</p>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '20px auto', textAlign: 'center' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate('/user/home')} className="btn-outline" style={{ marginTop: 16 }}>
          Back to Providers
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      {/* Header Back Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
        <button onClick={() => navigate('/user/home')} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaArrowLeft /> Back to Providers
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="provider-details-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 24 }}>
        
        {/* Left Side: Profile Details & Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Profile Card */}
          <section className="card animated-fade-up" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                  {provider.name}
                </h1>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 650 }}>
                  {provider.category_name} Service Specialist
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
                  {isOnline ? 'Online & Available' : 'Currently Offline'}
                </span>
                <span className="badge badge-warning">
                  <FaStar style={{ marginRight: 4 }} /> {Number(provider.average_rating || 0).toFixed(1)} Rating
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaBriefcase style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  <strong>Experience:</strong> {provider.experience} Years active service
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaMapMarkerAlt style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  <strong>Coverage details:</strong> {provider.working_area}, {provider.city}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>About Service Specialist</strong>
                <p style={{ fontSize: '0.925rem', margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {provider.description || 'This provider has not published any descriptive details yet.'}
                </p>
              </div>
            </div>
          </section>

          {/* Customer Reviews Section */}
          <section className="card animated-fade-up" style={{ animationDelay: '100ms', textAlign: 'left' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Reviews & Testimonials</h2>

            {reviews.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No reviews published yet for this provider.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>{review.customer_name}</strong>
                      <span className="badge badge-warning" style={{ padding: '2px 8px', fontSize: 10 }}>
                        <FaStar style={{ marginRight: 2 }} /> {review.rating}/5
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                      {review.review_text || 'No description provided.'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Sticky Booking Form */}
        <div>
          <section className="card animated-fade-up" style={{ position: 'sticky', top: 100, animationDelay: '150ms', textAlign: 'left' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Book Service</h2>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            {message && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                {message}
              </div>
            )}

            <form onSubmit={createBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Problem Details *</label>
                <textarea
                  name="service_description"
                  placeholder="Describe what services or repairs you need..."
                  value={form.service_description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="form-control"
                  style={{ resize: 'none', height: '80px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Service Address *</label>
                <textarea
                  name="service_address"
                  placeholder="Apartment name, building number, street..."
                  value={form.service_address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="form-control"
                  style={{ resize: 'none', height: '60px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Date & Time</label>
                <div className="input-icon-group">
                  <input
                    name="preferred_date"
                    type="datetime-local"
                    value={form.preferred_date}
                    onChange={handleChange}
                    className="form-control"
                  />
                  <span className="input-icon">
                    <FaCalendarAlt />
                  </span>
                </div>
              </div>

              {/* Emergency switch checkbox */}
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: '600',
                    color: 'var(--warning)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    name="emergency_booking"
                    type="checkbox"
                    checked={form.emergency_booking}
                    onChange={handleChange}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>Emergency / Urgent Booking (Provider will quote accordingly)</span>
                </label>
              </div>

              {!isOnline && (
                <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <FaExclamationTriangle />
                  <span>Provider is currently offline</span>
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading || !isOnline}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {bookingLoading
                  ? 'Requesting Service...'
                  : isOnline
                    ? 'Request Booking'
                    : 'Provider Unavailable'}
              </button>
            </form>
          </section>
        </div>

      </div>

      {/* Media responsiveness override styling */}
      <style>{`
        @media (max-width: 768px) {
          .provider-details-container {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProviderDetails;
