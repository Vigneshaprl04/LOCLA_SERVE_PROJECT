import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaCalendarAlt, FaComments, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load dashboard data: bookings & current availability
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        
        const bookingsRes = await api.get('/bookings/provider');
        setBookings(bookingsRes.data.bookings || []);

        const profileRes = await api.get('/providers/profile');
        if (profileRes.data && profileRes.data.provider) {
          setAvailability(!!profileRes.data.provider.availability_status);
        }
      } catch (err) {
        console.error('Dashboard Init Error:', err);
        setError(err.response?.data?.message || 'Unable to load dashboard details');
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, []);

  const updateAvailability = async () => {
    try {
      setError('');
      setMessage('');

      const newAvailability = !availability;

      await api.patch('/providers/availability', {
        availability_status: newAvailability,
      });

      setAvailability(newAvailability);
      setMessage(
        `Availability changed to ${newAvailability ? 'Online' : 'Offline'}`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update availability');
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      setUpdatingBookingId(bookingId);
      setError('');
      setMessage('');

      await api.patch(`/bookings/${bookingId}/status`, {
        status,
      });

      setMessage(`Booking #${bookingId} successfully updated to ${status.replace('_', ' ')}.`);
      
      const bookingsRes = await api.get('/bookings/provider');
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update booking status');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const pendingCount = bookings.filter(
    (booking) => booking.booking_status === 'pending'
  ).length;

  const activeCount = bookings.filter(
    (booking) => ['accepted', 'on_the_way', 'work_started'].includes(booking.booking_status)
  ).length;

  const completedCount = bookings.filter(
    (booking) => booking.booking_status === 'completed'
  ).length;

  const getStatusActions = (booking) => {
    const bookingId = booking.id;
    const disabled = updatingBookingId === bookingId;

    switch (booking.booking_status) {
      case 'pending':
        return (
          <>
            <button
              disabled={disabled}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => updateBookingStatus(bookingId, 'accepted')}
            >
              Accept Order
            </button>

            <button
              disabled={disabled}
              className="btn-danger"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => updateBookingStatus(bookingId, 'rejected')}
            >
              Reject Order
            </button>
          </>
        );

      case 'accepted':
        return (
          <button
            disabled={disabled}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => updateBookingStatus(bookingId, 'on_the_way')}
          >
            Start Transit
          </button>
        );

      case 'on_the_way':
        return (
          <button
            disabled={disabled}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => updateBookingStatus(bookingId, 'work_started')}
          >
            Start Service Work
          </button>
        );

      case 'work_started':
        return (
          <button
            disabled={disabled}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => updateBookingStatus(bookingId, 'completed')}
          >
            Complete Service
          </button>
        );

      case 'completed':
        return <span className="badge badge-success" style={{ fontSize: 11 }}>Service Completed</span>;

      case 'rejected':
        return <span className="badge badge-danger" style={{ fontSize: 11 }}>Booking Rejected</span>;

      case 'cancelled':
        return <span className="badge badge-danger" style={{ fontSize: 11 }}>Booking Cancelled</span>;

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <header style={{ marginBottom: 24, textAlign: 'left' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Partner Dashboard</h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Welcome back, {user?.name || 'Service Partner'}
        </p>
      </header>

      {error && (
        <div className="alert alert-danger animate-shake" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          {message}
        </div>
      )}

      {/* Stats Summary & Availability Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 30 }}>
        
        {/* Availability Toggle Card */}
        <section className="card animate-fade-up">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>Duty Status</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Work Channel:</p>
              <span className={`badge ${availability ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 4 }}>
                {availability ? 'ONLINE / ACCEPTING JOBS' : 'OFFLINE'}
              </span>
            </div>
            <button
              onClick={updateAvailability}
              className={availability ? 'btn-outline' : 'btn-primary'}
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              Go {availability ? 'Offline' : 'Online'}
            </button>
          </div>
        </section>

        {/* Stats Card */}
        <section className="card animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>Overview metrics</h2>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Pending</p>
              <span style={{ fontSize: 24, fontWeight: 800, color: pendingCount > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
                {pendingCount}
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Active</p>
              <span style={{ fontSize: 24, fontWeight: 800, color: activeCount > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                {activeCount}
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Completed</p>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>
                {completedCount}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Bookings List */}
      <section style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>Assigned Service Bookings</h2>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map((n) => (
              <div key={n} className="skeleton-card" style={{ height: 160 }}>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="card" style={{ padding: 50, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>No service bookings requested or assigned yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map((booking, index) => (
              <article
                key={booking.id}
                className="card animate-fade-up"
                style={{ 
                  animationDelay: `${index * 50}ms`, 
                  borderLeft: `4px solid ${
                    booking.booking_status === 'completed' ? 'var(--success)' :
                    booking.booking_status === 'pending' ? 'var(--warning)' : 'var(--primary)'
                  }` 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                      Booking #{booking.id}
                    </h3>
                    <p style={{ fontSize: 13, margin: '2px 0 0 0', color: 'var(--text-muted)' }}>
                      Customer: <strong>{booking.customer_name}</strong> &bull; {booking.customer_phone || 'No phone number'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-accent">
                      {booking.category_name}
                    </span>
                    <span className={`badge ${
                      booking.booking_status === 'pending' ? 'badge-warning' :
                      booking.booking_status === 'rejected' || booking.booking_status === 'cancelled' ? 'badge-danger' :
                      'badge-success'
                    }`}>
                      {booking.booking_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)' }}><strong>Description:</strong></p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>{booking.service_description}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)' }}><strong>Location Address:</strong></p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>{booking.service_address}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)' }}><strong>Schedule & Estimated Price:</strong></p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>
                      <FaCalendarAlt style={{ marginRight: 4 }} />
                      {booking.preferred_date ? new Date(booking.preferred_date).toLocaleString() : 'Not specified'}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 0 0', color: 'var(--primary)' }}>
                      ₹{booking.estimated_price}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16, borderTop: '1px dashed var(--border-color)', paddingTop: 14, flexWrap: 'wrap' }}>
                  {getStatusActions(booking)}
                  
                  <button
                    onClick={() => navigate(`/chat/${booking.id}`)}
                    className="btn-outline"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    <FaComments /> Chat Customer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProviderDashboard;