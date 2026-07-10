import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { FaWrench, FaCalendarAlt, FaMoneyBillWave, FaComments, FaCreditCard, FaStar, FaExclamationCircle } from 'react-icons/fa';

const MyBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/bookings/my');
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getNextStatusText = (status) => {
    const statusText = {
      pending: 'Pending Partner Review',
      accepted: 'Partner Accepted Booking',
      rejected: 'Booking Rejected',
      on_the_way: 'Partner is On the Way',
      work_started: 'Service Work In-Progress',
      completed: 'Service Job Completed',
      cancelled: 'Booking Cancelled',
    };

    return statusText[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'accepted': return 'badge-accent';
      case 'on_the_way':
      case 'work_started': return 'badge-accent';
      case 'completed': return 'badge-success';
      case 'rejected':
      case 'cancelled': return 'badge-danger';
      default: return 'badge-success';
    }
  };

  const canPay = (booking) => {
    return (
      booking.payment_status !== 'paid' &&
      ['accepted', 'on_the_way', 'work_started', 'completed'].includes(booking.booking_status)
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      {/* Page Header */}
      <header style={{ marginBottom: 28, textAlign: 'left' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>My Bookings</h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Track, manage, pay, and review your local service requests</p>
      </header>

      {error && (
        <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="booking-grid">
          {[1, 2].map((n) => (
            <div key={n} className="skeleton-card" style={{ height: 160 }}>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card animated-fade-up" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            You haven&apos;t requested any local service bookings yet.
          </p>
          <button onClick={() => navigate('/user/home')} className="btn-primary">
            Find Service Providers
          </button>
        </div>
      ) : (
        <div className="booking-grid">
          {bookings.map((booking, index) => (
            <article
              key={booking.id}
              className="booking-card card-lift animate-fade-up"
              style={{ 
                animationDelay: `${index * 60}ms`,
                borderLeft: `4px solid ${
                  booking.booking_status === 'completed' ? 'var(--success)' : 
                  booking.booking_status === 'cancelled' || booking.booking_status === 'rejected' ? 'var(--error)' :
                  'var(--primary)'
                }`
              }}
            >
              
              {/* Column 1: Provider Details & Status Badges */}
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`badge ${getStatusBadgeClass(booking.booking_status)}`}>
                    {getNextStatusText(booking.booking_status)}
                  </span>
                  <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    Payment: {booking.payment_status.toUpperCase()}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                  Booking #{booking.id}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  Specialist: <strong>{booking.provider_name}</strong> &bull; {booking.category_name}
                </p>
              </div>

              {/* Column 2: Problem detail & address schedule */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span className="booking-info-label">Problem details</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                    {booking.service_description}
                  </p>
                </div>
                <div>
                  <span className="booking-info-label">Schedule & Address</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    <FaCalendarAlt style={{ marginRight: 4, color: 'var(--primary)' }} />
                    {booking.preferred_date ? new Date(booking.preferred_date).toLocaleString() : 'Not specified'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '2px 0 0 0' }}>
                    {booking.service_address}
                  </p>
                </div>
              </div>

              {/* Column 3: Amount details and Action button loops */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div>
                  <span className="booking-info-label">Estimated Bill</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                      ₹{booking.estimated_price}
                    </span>
                    {booking.emergency_booking === 1 && (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        Emergency 1.5x
                      </span>
                    )}
                  </div>
                </div>

                <div className="booking-actions" style={{ width: '100%' }}>
                  <button
                    onClick={() => navigate(`/providers/${booking.provider_id}`)}
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  >
                    View Info
                  </button>

                  <button
                    onClick={() => navigate(`/chat/${booking.id}`)}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  >
                    <FaComments /> Chat
                  </button>

                  {canPay(booking) && (
                    <button
                      onClick={() => navigate(`/payment/${booking.id}`)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%' }}
                    >
                      <FaCreditCard /> Pay Securely
                    </button>
                  )}

                  {booking.booking_status === 'completed' && (
                    <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 4 }}>
                      <button
                        onClick={() => navigate(`/review/${booking.id}`)}
                        className="btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, borderColor: 'var(--warning)', color: 'var(--warning)' }}
                      >
                        <FaStar /> Review
                      </button>

                      <button
                        onClick={() => navigate(`/complaint/${booking.id}`)}
                        className="btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}
                      >
                        <FaExclamationCircle /> Dispute
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </article>
          ))}
        </div>
      )}

    </div>
  );
};

export default MyBookings;
