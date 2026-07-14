import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { FaWrench, FaCalendarAlt, FaMoneyBillWave, FaComments, FaCreditCard, FaStar, FaExclamationCircle } from 'react-icons/fa';

const MyBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review Modal States
  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Complaint Modal States
  const [complaintBookingId, setComplaintBookingId] = useState(null);
  const [complaintText, setComplaintText] = useState('');
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');

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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please provide a rating between 1 and 5');
      return;
    }
    try {
      setReviewLoading(true);
      setError('');
      setReviewSuccess('');
      const res = await api.post('/reviews', {
        booking_id: reviewBookingId,
        rating: Number(rating),
        review_text: reviewText
      });
      setReviewSuccess(res.data.message || 'Review submitted successfully!');
      setReviewText('');
      setRating(5);
      setTimeout(() => {
        setReviewBookingId(null);
        setReviewSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      setError('Please describe your dispute details');
      return;
    }
    try {
      setComplaintLoading(true);
      setError('');
      setComplaintSuccess('');
      const res = await api.post('/complaints', {
        booking_id: complaintBookingId,
        complaint_description: complaintText
      });
      setComplaintSuccess(res.data.message || 'Dispute submitted successfully!');
      setComplaintText('');
      setTimeout(() => {
        setComplaintBookingId(null);
        setComplaintSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit dispute');
    } finally {
      setComplaintLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateQuoteStatus = async (bookingId, status) => {
    try {
      setError('');
      setLoading(true);
      await api.patch(`/bookings/${bookingId}/customer-status`, { status });
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update quote status');
      setLoading(false);
    }
  };

  const getNextStatusText = (status) => {
    const statusText = {
      pending: 'Pending Partner Review',
      quoted: 'Quote Received',
      quote_rejected: 'Quote Rejected by You',
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
      case 'quoted': return 'badge-warning';
      case 'accepted': return 'badge-accent';
      case 'on_the_way':
      case 'work_started': return 'badge-accent';
      case 'completed': return 'badge-success';
      case 'rejected':
      case 'quote_rejected':
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
                    Payment: {(booking.payment_status || 'pending').toUpperCase()}
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
                    {booking.booking_status === 'pending' ? (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Waiting for provider response
                      </span>
                    ) : booking.booking_status === 'quote_rejected' ? (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Quote Rejected
                      </span>
                    ) : booking.estimated_price ? (
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                        ₹{booking.estimated_price}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Waiting for quote
                      </span>
                    )}
                    {booking.emergency_booking === 1 && (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        Emergency
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

                  {booking.booking_status === 'quoted' && (
                    <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
                      <button
                        onClick={() => handleUpdateQuoteStatus(booking.id, 'accepted')}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                      >
                        Accept Quote
                      </button>
                      <button
                        onClick={() => handleUpdateQuoteStatus(booking.id, 'quote_rejected')}
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                      >
                        Reject Quote
                      </button>
                    </div>
                  )}

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
                        onClick={() => setReviewBookingId(booking.id)}
                        className="btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, borderColor: 'var(--warning)', color: 'var(--warning)' }}
                      >
                        <FaStar /> Review
                      </button>

                      <button
                        onClick={() => setComplaintBookingId(booking.id)}
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

      {/* Review Modal */}
      {reviewBookingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 450, padding: 24, textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaStar style={{ color: 'var(--warning)' }} /> Share Your Feedback
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Rate your experience for booking #{reviewBookingId} to help others find quality help.
            </p>
            {reviewSuccess ? (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                {reviewSuccess}
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Rating Stars (1-5)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '1.75rem', color: star <= rating ? 'var(--warning)' : '#e4e5e9',
                          padding: 0
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="reviewText" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Comments / Feedback (min 10 chars)
                  </label>
                  <textarea
                    id="reviewText"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write details of the repair or service quality..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                      color: 'var(--text-main)', fontSize: 13, resize: 'none', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setReviewBookingId(null)}
                    className="btn-outline"
                    style={{ flex: 1, padding: '10px 0' }}
                    disabled={reviewLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 0' }}
                    disabled={reviewLoading || reviewText.trim().length < 10}
                  >
                    {reviewLoading ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintBookingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 450, padding: 24, textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaExclamationCircle style={{ color: 'var(--error)' }} /> File a Service Dispute
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Let admin support review booking #{complaintBookingId} for billing, behavior or scheduling issues.
            </p>
            {complaintSuccess ? (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                {complaintSuccess}
              </div>
            ) : (
              <form onSubmit={handleComplaintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="complaintText" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Describe your issue / complaint details
                  </label>
                  <textarea
                    id="complaintText"
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder="Tell us what went wrong so our admin support team can investigate..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                      color: 'var(--text-main)', fontSize: 13, resize: 'none', boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setComplaintBookingId(null)}
                    className="btn-outline"
                    style={{ flex: 1, padding: '10px 0' }}
                    disabled={complaintLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 0', background: 'var(--error)', borderColor: 'var(--error)' }}
                    disabled={complaintLoading || !complaintText.trim()}
                  >
                    {complaintLoading ? 'Submitting…' : 'Submit Dispute'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MyBookings;
