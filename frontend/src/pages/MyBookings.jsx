import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaWrench, FaCalendarAlt, FaComments, FaCreditCard, FaStar, FaExclamationCircle, FaUser, FaRobot } from 'react-icons/fa';
import { BookingContext } from '../context/BookingContext';
import { useBookingStatus } from '../hooks/useBookingStatus';
import { motion, AnimatePresence } from 'framer-motion';
import MapTracking from '../components/MapTracking';


/**
 * Redesigned Premium User Bookings Management screen.
 * Integrates reusable GlassCard components and custom loaders.
 */
const MyBookings = () => {
  const navigate = useNavigate();
  const { updateBookingLocalStatus } = useContext(BookingContext);

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
  const [drafting, setDrafting] = useState(false);

  const handleAiDraft = async () => {
    if (!complaintText.trim()) return;
    try {
      setDrafting(true);
      const res = await api.post('/ai/draft-dispute', { description: complaintText });
      if (res.data.success) {
        setComplaintText(res.data.draft);
      }
    } catch (err) {
      console.log('Skipped drafting dispute details:', err.message);
    } finally {
      setDrafting(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/bookings/my');
      const bookingsList = response.data.bookings || [];
      setBookings(bookingsList);

      // Pre-populate BookingContext
      bookingsList.forEach((booking) => {
        updateBookingLocalStatus(booking.id, {
          status: booking.booking_status,
          updatedAt: booking.updated_at || booking.created_at
        });
      });
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
        fetchBookings();
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
      pending: 'Pending Review',
      quoted: 'Quote Received',
      quote_rejected: 'Quote Rejected',
      accepted: 'Accepted',
      rejected: 'Rejected',
      on_the_way: 'Partner On The Way',
      work_started: 'Work In-Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
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
    <motion.div 
      style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      {/* Page Header */}
      <header style={{ marginBottom: 32, textAlign: 'left' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          My Bookings
        </h1>
        <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Track, manage, pay, and review your local service requests</p>
      </header>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px 0' }}>
          <Loader size={50} text="Fetching service history..." />
        </div>
      ) : bookings.length === 0 ? (
        <GlassCard hoverLift={false} style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            You haven&apos;t requested any local service bookings yet.
          </p>
          <GlassButton onClick={() => navigate('/user/home')} variant="primary">
            Find Service Providers
          </GlassButton>
        </GlassCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {bookings.map((booking, index) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              index={index}
              navigate={navigate}
              onUpdateQuoteStatus={handleUpdateQuoteStatus}
              onReviewOpen={setReviewBookingId}
              onComplaintOpen={setComplaintBookingId}
              canPay={canPay}
              getStatusBadgeClass={getStatusBadgeClass}
              getNextStatusText={getNextStatusText}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewBookingId && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 10, 0.75)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: 16
          }}>
            <motion.div 
              className="card" 
              style={{ width: '100%', maxWidth: 450, padding: 32, textAlign: 'left' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
                <FaStar style={{ color: 'var(--warning)' }} /> Share Your Feedback
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Rate your experience for booking #{reviewBookingId} to help others find quality help.
              </p>
              {reviewSuccess ? (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  {reviewSuccess}
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                      Rating Stars (1-5)
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '2rem', color: star <= rating ? 'var(--warning)' : 'var(--text-light)',
                            padding: 0, transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e)=>e.target.style.transform='scale(1.15)'}
                          onMouseLeave={(e)=>e.target.style.transform='scale(1)'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="reviewText" className="form-label">
                      Comments / Feedback (min 10 chars)
                    </label>
                    <textarea
                      id="reviewText"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us what you liked or how they can improve..."
                      rows={4}
                      className="form-control"
                      style={{ resize: 'none', minHeight: '90px' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <GlassButton
                      type="button"
                      onClick={() => setReviewBookingId(null)}
                      variant="outline"
                      style={{ flex: 1 }}
                      disabled={reviewLoading}
                    >
                      Cancel
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      variant="primary"
                      style={{ flex: 1 }}
                      disabled={reviewLoading || reviewText.trim().length < 10}
                    >
                      {reviewLoading ? 'Submitting…' : 'Submit Review'}
                    </GlassButton>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complaint Modal */}
      <AnimatePresence>
        {complaintBookingId && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 10, 0.75)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: 16
          }}>
            <motion.div 
              className="card" 
              style={{ width: '100%', maxWidth: 450, padding: 32, textAlign: 'left' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
                <FaExclamationCircle style={{ color: 'var(--error)' }} /> File a Service Dispute
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Let admin support review booking #{complaintBookingId} for billing, behavior or scheduling issues.
              </p>
              {complaintSuccess ? (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  {complaintSuccess}
                </div>
              ) : (
                <form onSubmit={handleComplaintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label htmlFor="complaintText" className="form-label" style={{ margin: 0 }}>
                        Describe your dispute details
                      </label>
                      <button
                        type="button"
                        onClick={handleAiDraft}
                        disabled={drafting || !complaintText.trim()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaRobot /> {drafting ? 'Drafting...' : 'Polish with AI'}
                      </button>
                    </div>
                    <textarea
                      id="complaintText"
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder="Tell us what went wrong so our admin support team can investigate..."
                      rows={4}
                      className="form-control"
                      style={{ resize: 'none', minHeight: '90px' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <GlassButton
                      type="button"
                      onClick={() => setComplaintBookingId(null)}
                      variant="outline"
                      style={{ flex: 1 }}
                      disabled={complaintLoading}
                    >
                      Cancel
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      variant="danger"
                      style={{ flex: 1 }}
                      disabled={complaintLoading || !complaintText.trim()}
                    >
                      {complaintLoading ? 'Submitting…' : 'Submit Dispute'}
                    </GlassButton>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

const BookingCard = ({
  booking,
  index,
  navigate,
  onUpdateQuoteStatus,
  onReviewOpen,
  onComplaintOpen,
  canPay,
  getStatusBadgeClass,
  getNextStatusText
}) => {
  const { status } = useBookingStatus(booking.id);
  const currentStatus = status || booking.booking_status;
  const [showTracking, setShowTracking] = useState(false);

  const b = { ...booking, booking_status: currentStatus };


  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <GlassCard 
        hoverLift={true}
        style={{
          padding: 28,
          textAlign: 'left'
        }}
      >
        {/* Neon accent left border line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          background: b.booking_status === 'completed' ? 'var(--success)' : 
                      b.booking_status === 'cancelled' || b.booking_status === 'rejected' ? 'var(--error)' :
                      'linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%)',
          boxShadow: b.booking_status === 'completed' ? '0 0 10px var(--success-glow)' : 'none'
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          
          {/* Section 1: Details & Badges */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className={`badge ${getStatusBadgeClass(b.booking_status)}`}>
                {getNextStatusText(b.booking_status)}
              </span>
              <span className={`badge ${b.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {(b.payment_status || 'pending').toUpperCase()}
              </span>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
              Booking #{b.id}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaUser size={12} style={{ color: 'var(--accent)' }} /> <strong>{b.provider_name}</strong> &bull; {b.category_name}
            </p>
          </div>

          {/* Section 2: Requirement Info & Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700 }}>Requirement</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                {b.service_description}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700 }}>Schedule</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaCalendarAlt style={{ color: 'var(--accent)' }} />
                {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString() : 'Not specified'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {b.service_address}
              </p>
            </div>
          </div>

          {/* Section 3: Pricing and Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch', gap: 16 }}>
            <div>
              <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700 }}>Estimate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {b.booking_status === 'pending' ? (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Pending quote
                  </span>
                ) : b.booking_status === 'quote_rejected' ? (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Quote Rejected
                  </span>
                ) : b.estimated_price ? (
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                    ₹{b.estimated_price}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Pending estimate
                  </span>
                )}
                {b.emergency_booking === 1 && (
                  <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    Emergency
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <GlassButton
                  onClick={() => navigate(`/providers/${b.provider_id}`)}
                  variant="outline"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                >
                  Profile
                </GlassButton>

                <GlassButton
                  onClick={() => navigate(`/chat/${b.id}`)}
                  variant="secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                >
                  <FaComments /> Chat
                </GlassButton>
              </div>

              {b.booking_status === 'quoted' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <GlassButton
                    onClick={() => onUpdateQuoteStatus(b.id, 'accepted')}
                    variant="primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  >
                    Accept
                  </GlassButton>
                  <GlassButton
                    onClick={() => onUpdateQuoteStatus(b.id, 'quote_rejected')}
                    variant="danger"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  >
                    Reject
                  </GlassButton>
                </div>
              )}

              {canPay(b) && (
                <GlassButton
                  onClick={() => navigate(`/payment/${b.id}`)}
                  variant="primary"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  <FaCreditCard /> Pay Securely
                </GlassButton>
              )}

              {['accepted', 'on_the_way'].includes(b.booking_status) && (
                <GlassButton
                  onClick={() => setShowTracking(!showTracking)}
                  variant="primary"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FaLocationArrow /> {showTracking ? 'Hide Tracking Map' : 'Track Service Partner'}
                </GlassButton>
              )}

              {b.booking_status === 'completed' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <GlassButton
                    onClick={() => onReviewOpen(b.id)}
                    variant="secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.2)' }}
                  >
                    <FaStar /> Review
                  </GlassButton>

                  <GlassButton
                    onClick={() => onComplaintOpen(b.id)}
                    variant="outline"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, color: 'var(--error)', borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    <FaExclamationCircle /> Dispute
                  </GlassButton>
                </div>
              )}
            </div>
          </div>

        </div>

        {showTracking && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <MapTracking bookingId={b.id} bookingStatus={b.booking_status} />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default MyBookings;
