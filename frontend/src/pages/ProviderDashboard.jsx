import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaTimesCircle, FaCalendarAlt, FaComments, FaSync, FaPowerOff, FaLocationArrow, FaChartLine, FaWallet, FaTasks } from 'react-icons/fa';
import { BookingContext } from '../context/BookingContext';
import { useBookingStatus } from '../hooks/useBookingStatus';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Redesigned Premium Provider Dashboard screen.
 * Integrates location reporting, online presence toggles, and dynamic metrics.
 */
const ProviderDashboard = () => {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const { updateBookingLocalStatus } = useContext(BookingContext);

  const [bookings, setBookings] = useState([]);
  const [providerId, setProviderId] = useState(null);
  const [availability, setAvailability] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [prices, setPrices] = useState({});

  // Provider earnings analytics state
  const [earnings, setEarnings] = useState({
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    averageEarnings: 0
  });

  // Load dashboard data: bookings, availability & earnings stats
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        
        const bookingsRes = await api.get('/bookings/provider');
        const bookingsList = bookingsRes.data.bookings || [];
        setBookings(bookingsList);

        // Pre-populate BookingContext
        bookingsList.forEach((booking) => {
          updateBookingLocalStatus(booking.id, {
            status: booking.booking_status,
            updatedAt: booking.updated_at || booking.created_at
          });
        });

        const profileRes = await api.get('/providers/profile');
        if (profileRes.data && profileRes.data.provider) {
          const prov = profileRes.data.provider;
          setProviderId(prov.provider_id);
          setAvailability(!!prov.availability_status);
          setLatitude(prov.latitude || null);
          setLongitude(prov.longitude || null);
          setLastLocationUpdate(prov.last_location_updated_at || null);
        }

        try {
          const statsRes = await api.get('/payments/dashboard/provider');
          if (statsRes.data && statsRes.data.stats) {
            setEarnings(statsRes.data.stats);
          }
        } catch (statsErr) {
          console.error('Failed to load provider earnings stats:', statsErr);
        }
      } catch (err) {
        console.error('Dashboard Init Error:', err);
        setError(err.response?.data?.message || 'Unable to load dashboard details');
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, [updateBookingLocalStatus]);

  // Emit provider_join when socket connects or reconnects
  useEffect(() => {
    if (!socket || !providerId) return;

    const joinPresence = () => {
      socket.emit("provider_join", { providerId });
      console.log(`[Dashboard] Emitted provider_join for provider ${providerId}`);
    };

    if (socket.connected) {
      joinPresence();
    }

    socket.on("connect", joinPresence);

    return () => {
      socket.off("connect", joinPresence);
    };
  }, [socket, providerId]);

  // Emit provider_heartbeat every 30 seconds from the provider client
  useEffect(() => {
    if (!socket || !providerId) return;

    const sendHeartbeat = () => {
      if (socket.connected) {
        socket.emit("provider_heartbeat");
        console.log("[Dashboard] Emitted heartbeat to server");
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [socket, providerId]);

  const handleGoOnline = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setGeoLoading(true);
    setError('');
    setMessage('');
    setApiLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;

        try {
          setGeoLoading(false);
          const res = await api.patch('/providers/availability', {
            availability_status: true,
            latitude: lat,
            longitude: lng
          });

          setAvailability(true);
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          if (res.data?.last_location_updated_at) {
            setLastLocationUpdate(res.data.last_location_updated_at);
          } else {
            setLastLocationUpdate(new Date().toISOString());
          }
          setMessage("You are online at your current location.");
        } catch (err) {
          setError(err.response?.data?.message || 'Unable to go online');
        } finally {
          setApiLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setApiLoading(false);
        let msg = "Failed to get location";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied by user. You must allow location to go online.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location details are unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location retrieval timed out. Please try again.";
        }
        setError(msg);
      },
      options
    );
  };

  const handleGoOffline = async () => {
    try {
      setError('');
      setMessage('');
      setApiLoading(true);

      const res = await api.patch('/providers/availability', {
        availability_status: false
      });

      setAvailability(false);
      if (res.data) {
        setLatitude(res.data.latitude || null);
        setLongitude(res.data.longitude || null);
        setLastLocationUpdate(res.data.last_location_updated_at || null);
      }
      setMessage("You are offline / not accepting jobs.");
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update availability');
    } finally {
      setApiLoading(false);
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

      updateBookingLocalStatus(bookingId, { status });
      setMessage(`Booking #${bookingId} successfully updated to ${status.replace(/_/g, ' ')}.`);
      
      const bookingsRes = await api.get('/bookings/provider');
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update booking status');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleSendQuote = async (bookingId, price) => {
    try {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        setError('Please enter a valid price greater than 0.');
        return;
      }
      setUpdatingBookingId(bookingId);
      setError('');
      setMessage('');

      await api.patch(`/bookings/${bookingId}/status`, {
        status: 'quoted',
        estimated_price: priceNum
      });

      updateBookingLocalStatus(bookingId, { status: 'quoted' });
      setMessage(`Quote of ₹${priceNum} sent for Booking #${bookingId}.`);
      
      const bookingsRes = await api.get('/bookings/provider');
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send quote');
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: '340px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Estimated Price (₹) *</label>
              <input
                type="number"
                min="1"
                placeholder="Enter price estimate"
                className="form-control"
                style={{ padding: '8px 14px', fontSize: 13, height: '38px' }}
                value={prices[bookingId] || ''}
                onChange={(e) => setPrices({ ...prices, [bookingId]: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <GlassButton
                disabled={disabled || !prices[bookingId] || Number(prices[bookingId]) <= 0}
                variant="primary"
                onClick={() => handleSendQuote(bookingId, prices[bookingId])}
                style={{ fontSize: 12, padding: '8px 12px', flex: 1 }}
              >
                Send Quote
              </GlassButton>
              <GlassButton
                disabled={disabled}
                variant="danger"
                onClick={() => updateBookingStatus(bookingId, 'rejected')}
                style={{ fontSize: 12, padding: '8px 12px', flex: 1 }}
              >
                Reject Order
              </GlassButton>
            </div>
          </div>
        );

      case 'quoted':
        return <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Waiting for Customer</span>;

      case 'quote_rejected':
        return <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Quote Rejected by Customer</span>;

      case 'accepted':
        return (
          <GlassButton
            disabled={disabled}
            variant="secondary"
            onClick={() => updateBookingStatus(bookingId, 'on_the_way')}
            style={{ fontSize: 12, padding: '8px 16px' }}
          >
            Start Transit
          </GlassButton>
        );

      case 'on_the_way':
        return (
          <GlassButton
            disabled={disabled}
            variant="secondary"
            onClick={() => updateBookingStatus(bookingId, 'work_started')}
            style={{ fontSize: 12, padding: '8px 16px' }}
          >
            Start Service Work
          </GlassButton>
        );

      case 'work_started':
        return (
          <GlassButton
            disabled={disabled}
            variant="primary"
            onClick={() => updateBookingStatus(bookingId, 'completed')}
            style={{ fontSize: 12, padding: '8px 16px' }}
          >
            Complete Service
          </GlassButton>
        );

      case 'completed':
        return <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Service Completed</span>;

      case 'rejected':
        return <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Booking Rejected</span>;

      case 'cancelled':
        return <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Booking Cancelled</span>;

      default:
        return null;
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Opening partner analytics dashboard..." />
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
      
      {/* Header */}
      <header style={{ marginBottom: 32, textAlign: 'left' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Partner Dashboard
        </h1>
        <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Welcome back, {user?.name || 'Service Partner'}
        </p>
      </header>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: 24 }}>
          {message}
        </div>
      )}

      {/* Stats Summary & Availability Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
        
        {/* Availability Geolocation Card */}
        <GlassCard hoverLift={false} style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
            <FaLocationArrow style={{ color: 'var(--accent)', fontSize: 14 }} /> Duty Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Work Channel:</p>
              <span className={`badge ${availability ? 'badge-success' : 'badge-warning'}`}>
                {availability ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {(latitude !== null && longitude !== null) && (
              <div style={{ padding: '12px 14px', background: 'rgba(6, 182, 212, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.15)', fontSize: 13 }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>
                  📍 Current Coordinates
                </p>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-main)' }}>
                  Lat: {Number(latitude).toFixed(6)}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-main)' }}>
                  Lng: {Number(longitude).toFixed(6)}
                </div>
                {accuracy !== null && (
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                    Accuracy bounds: ±{Math.round(accuracy)} m
                  </div>
                )}
                {lastLocationUpdate && (
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                    Last sync: {new Date(lastLocationUpdate).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {geoLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent)', padding: '4px 0' }}>
                <span className="animate-spin" style={{ display: 'inline-block' }}>🌀</span>
                Locating active GPS...
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {!availability ? (
                <GlassButton
                  onClick={handleGoOnline}
                  variant="primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  disabled={apiLoading || geoLoading}
                >
                  <FaPowerOff style={{ fontSize: 12 }} />
                  {geoLoading ? 'Locating…' : apiLoading ? 'Connecting…' : 'Go Online'}
                </GlassButton>
              ) : (
                <>
                  <GlassButton
                    onClick={handleGoOnline}
                    variant="outline"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={apiLoading || geoLoading}
                    title="Refresh location coordinates"
                  >
                    <FaSync style={{ fontSize: 11 }} /> Sync GPS
                  </GlassButton>
                  <GlassButton
                    onClick={handleGoOffline}
                    variant="danger"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={apiLoading || geoLoading}
                  >
                    <FaTimesCircle style={{ fontSize: 11 }} /> Go Offline
                  </GlassButton>
                </>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Stats Card */}
        <GlassCard hoverLift={false} style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
            <FaTasks style={{ color: 'var(--accent)', fontSize: 14 }} /> Overview Metrics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Pending</p>
              <span style={{ fontSize: 32, fontWeight: 900, color: pendingCount > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
                {pendingCount}
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Active</p>
              <span style={{ fontSize: 32, fontWeight: 900, color: activeCount > 0 ? 'var(--accent)' : 'var(--text-main)' }}>
                {activeCount}
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Completed</p>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--success)' }}>
                {completedCount}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Earnings Card */}
        <GlassCard hoverLift={false} style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
            <FaWallet style={{ color: 'var(--accent)', fontSize: 14 }} /> Earnings & Revenue
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, textAlign: 'left' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Today</p>
              <strong style={{ fontSize: 18, color: 'var(--success)', fontWeight: 800 }}>₹{earnings.todayEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>This Week</p>
              <strong style={{ fontSize: 18, color: 'var(--primary-light)', fontWeight: 800 }}>₹{earnings.weeklyEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>This Month</p>
              <strong style={{ fontSize: 18, color: 'var(--text-main)', fontWeight: 800 }}>₹{earnings.monthlyEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Job Avg</p>
              <strong style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 800 }}>₹{earnings.averageEarnings.toFixed(2)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, borderTop: '1px solid var(--glass-border)', paddingTop: 10, fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Settled: <strong style={{ color: 'var(--success)' }}>{earnings.completedPayments}</strong></span>
            <span>Pending: <strong style={{ color: 'var(--warning)' }}>{earnings.pendingPayments}</strong></span>
            <span>Failed: <strong style={{ color: 'var(--error)' }}>{earnings.failedPayments}</strong></span>
          </div>
        </GlassCard>
      </div>

      {/* Bookings List */}
      <section style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
          Assigned Service Bookings
        </h2>
        
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
          <GlassCard hoverLift={false} style={{ padding: 50, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>No service bookings requested or assigned yet.</p>
          </GlassCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {bookings.map((booking, index) => (
              <ProviderBookingCard
                key={booking.id}
                booking={booking}
                index={index}
                navigate={navigate}
                getStatusActions={getStatusActions}
              />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
};

const ProviderBookingCard = ({
  booking,
  index,
  navigate,
  getStatusActions
}) => {
  const { status } = useBookingStatus(booking.id);
  const currentStatus = status || booking.booking_status;

  const b = { ...booking, booking_status: currentStatus };

  return (
    <motion.div
      initial={{ y: 15, opacity: 0 }}
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
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          background: b.booking_status === 'completed' ? 'var(--success)' :
                      b.booking_status === 'pending' ? 'var(--warning)' : 
                      'linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%)',
          boxShadow: b.booking_status === 'completed' ? '0 0 10px var(--success-glow)' : 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
              Booking #{b.id}
            </h3>
            <p style={{ fontSize: '0.9rem', margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
              Customer: <strong>{b.customer_name}</strong> &bull; {b.customer_phone || 'No phone number'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-accent">
              {b.category_name}
            </span>
            <span className={`badge ${
              b.booking_status === 'pending' || b.booking_status === 'quoted' ? 'badge-warning' :
              b.booking_status === 'rejected' || b.booking_status === 'cancelled' || b.booking_status === 'quote_rejected' ? 'badge-danger' :
              'badge-success'
            }`}>
              {b.booking_status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700, marginBottom: 4 }}>Job Details</p>
            <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.45 }}>{b.service_description}</p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700, marginBottom: 4 }}>Location Address</p>
            <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.45 }}>{b.service_address}</p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700, marginBottom: 4 }}>Preferred Date & Price</p>
            <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)' }}>
              <FaCalendarAlt style={{ marginRight: 6, color: 'var(--accent)' }} />
              {b.preferred_date ? new Date(b.preferred_date).toLocaleString() : 'Not specified'}
            </p>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--accent)' }}>
              {b.estimated_price ? `₹${b.estimated_price}` : 'Quote Pending'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, borderTop: '1px dashed var(--glass-border)', paddingTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {getStatusActions(b)}
          
          <GlassButton
            onClick={() => navigate(`/chat/${b.id}`)}
            variant="outline"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <FaComments /> Chat Customer
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default ProviderDashboard;