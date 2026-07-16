import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaCalendarAlt, FaComments, FaCheck, FaExclamationTriangle, FaSync, FaPowerOff, FaLocationArrow } from 'react-icons/fa';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
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
        setBookings(bookingsRes.data.bookings || []);

        const profileRes = await api.get('/providers/profile');
        if (profileRes.data && profileRes.data.provider) {
          const prov = profileRes.data.provider;
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
  }, []);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: '300px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Estimated Price (₹) *</label>
              <input
                type="number"
                min="1"
                placeholder="Enter price"
                className="form-control"
                style={{ padding: '6px 12px', fontSize: 13, height: '36px' }}
                value={prices[bookingId] || ''}
                onChange={(e) => setPrices({ ...prices, [bookingId]: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={disabled || !prices[bookingId] || Number(prices[bookingId]) <= 0}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13, flex: 1 }}
                onClick={() => handleSendQuote(bookingId, prices[bookingId])}
              >
                Send Quote
              </button>
              <button
                disabled={disabled}
                className="btn-danger"
                style={{ padding: '8px 16px', fontSize: 13, flex: 1 }}
                onClick={() => updateBookingStatus(bookingId, 'rejected')}
              >
                Reject Order
              </button>
            </div>
          </div>
        );

      case 'quoted':
        return <span className="badge badge-warning" style={{ fontSize: 11 }}>Quote Sent (Waiting for Customer)</span>;

      case 'quote_rejected':
        return <span className="badge badge-danger" style={{ fontSize: 11 }}>Quote Rejected by Customer</span>;

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
        
        {/* Availability Geolocation Card */}
        <section className="card animate-fade-up">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaLocationArrow style={{ color: 'var(--primary)', fontSize: 14 }} /> Duty Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Work Channel:</p>
              <span className={`badge ${availability ? 'badge-success' : 'badge-warning'}`}>
                {availability ? 'ONLINE / ACCEPTING JOBS' : 'OFFLINE / NOT ACCEPTING JOBS'}
              </span>
            </div>

            {(latitude !== null && longitude !== null) && (
              <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', fontSize: 13 }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>
                  📍 Current Location
                </p>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-main)' }}>
                  Lat: {Number(latitude).toFixed(6)}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-main)' }}>
                  Lng: {Number(longitude).toFixed(6)}
                </div>
                {accuracy !== null && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Accuracy: ±{Math.round(accuracy)} m
                  </div>
                )}
                {lastLocationUpdate && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Last update: {new Date(lastLocationUpdate).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {geoLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary)', padding: '4px 0' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🌀</span>
                Acquiring GPS location…
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {!availability ? (
                <button
                  onClick={handleGoOnline}
                  className="btn-primary"
                  style={{ width: '100%', padding: '9px 14px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={apiLoading || geoLoading}
                >
                  <FaPowerOff style={{ fontSize: 12 }} />
                  {geoLoading ? 'Locating…' : apiLoading ? 'Going Online…' : 'Go Online at Current Location'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleGoOnline}
                    className="btn-outline"
                    style={{ flex: 1, padding: '9px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    disabled={apiLoading || geoLoading}
                    title="Refresh your current GPS location"
                  >
                    <FaSync style={{ fontSize: 11, animation: (apiLoading || geoLoading) ? 'spin 1s linear infinite' : 'none' }} />
                    {geoLoading || apiLoading ? 'Refreshing…' : 'Refresh Location'}
                  </button>
                  <button
                    onClick={handleGoOffline}
                    className="btn-primary"
                    style={{ flex: 1, padding: '9px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#ef4444', borderColor: '#ef4444' }}
                    disabled={apiLoading || geoLoading}
                  >
                    <FaTimesCircle style={{ fontSize: 11 }} />
                    {apiLoading ? 'Going Offline…' : 'Go Offline'}
                  </button>
                </>
              )}
            </div>
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

        {/* Earnings Card */}
        <section className="card animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>Earnings & Payments</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, textAlign: 'left' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Today</p>
              <strong style={{ fontSize: 16, color: 'var(--success)' }}>₹{earnings.todayEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>This Week</p>
              <strong style={{ fontSize: 16, color: 'var(--primary)' }}>₹{earnings.weeklyEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>This Month</p>
              <strong style={{ fontSize: 16, color: 'var(--text-main)' }}>₹{earnings.monthlyEarnings.toFixed(2)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Average Job</p>
              <strong style={{ fontSize: 16, color: 'var(--accent)' }}>₹{earnings.averageEarnings.toFixed(2)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 8, fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Paid Jobs: <strong style={{ color: 'var(--success)' }}>{earnings.completedPayments}</strong></span>
            <span>Pending: <strong style={{ color: 'var(--warning)' }}>{earnings.pendingPayments}</strong></span>
            <span>Failed: <strong style={{ color: '#ef4444' }}>{earnings.failedPayments}</strong></span>
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
                      booking.booking_status === 'pending' || booking.booking_status === 'quoted' ? 'badge-warning' :
                      booking.booking_status === 'rejected' || booking.booking_status === 'cancelled' || booking.booking_status === 'quote_rejected' ? 'badge-danger' :
                      'badge-success'
                    }`}>
                      {booking.booking_status.replace(/_/g, ' ').toUpperCase()}
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
                      {booking.estimated_price ? `₹${booking.estimated_price}` : 'Quote Pending'}
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