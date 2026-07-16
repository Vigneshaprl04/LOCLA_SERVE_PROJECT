import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { FaUserCheck, FaUserClock, FaUsers, FaArrowRight, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Admin financial overview analytics state
  const [revenueStats, setRevenueStats] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    totalRevenue: 0,
    refundCount: 0
  });

  const fetchDashboardData = async () => {
    try {
      setError('');
      setLoading(true);
      
      const response = await api.get('/admin/providers/pending');
      setProviders(response.data.providers || []);

      try {
        const statsRes = await api.get('/payments/dashboard/admin');
        if (statsRes.data && statsRes.data.stats) {
          setRevenueStats(statsRes.data.stats);
        }
      } catch (statsErr) {
        console.error('Failed to load admin revenue stats:', statsErr);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to fetch admin dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const updateVerification = async (providerId, status) => {
    const confirmation = window.confirm(
      `Are you sure you want to change this provider's status to ${status.toUpperCase()}?`
    );
    if (!confirmation) return;

    try {
      setUpdatingId(providerId);
      setError('');
      setMessage('');

      await api.patch(`/admin/providers/${providerId}/verification`, {
        status,
      });

      setMessage(`Partner application successfully ${status === 'verified' ? 'approved' : 'rejected'}.`);
      await fetchPendingProviders();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to update provider verification'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <header style={{ marginBottom: 28, textAlign: 'left' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Admin Control Center</h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Welcome, {user?.name || 'System Administrator'}</p>
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

      {/* Overview Stats Grid */}
      <div className="stats-grid animate-fade-up">
        
        <div className="stats-card stats-total">
          <span className="stats-label">Total platform Users</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="stats-value">84</span>
            <FaUsers size={22} style={{ color: 'var(--secondary)' }} />
          </div>
        </div>

        <div className="stats-card stats-active">
          <span className="stats-label">Verified Providers</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="stats-value">21</span>
            <FaUserCheck size={22} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        <div className="stats-card stats-pending">
          <span className="stats-label">Verification Queue</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="stats-value" style={{ color: providers.length > 0 ? 'var(--warning)' : 'inherit' }}>
              {providers.length}
            </span>
            <FaUserClock size={22} style={{ color: 'var(--warning)' }} />
          </div>
        </div>

        <div className="stats-card stats-completed">
          <span className="stats-label">Disputed Bookings</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="stats-value">0</span>
            <FaUserCheck size={22} style={{ color: 'var(--accent)' }} />
          </div>
        </div>

      </div>

      {/* Financial Overview stats grid */}
      <section style={{ textAlign: 'left', marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>Financial & Revenue Overview</h2>
        <div className="stats-grid animate-fade-up">
          <div className="stats-card stats-completed" style={{ borderLeft: '4px solid var(--success)' }}>
            <span className="stats-label">Today's Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="stats-value" style={{ color: 'var(--success)' }}>₹{revenueStats.todayRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="stats-card stats-active" style={{ borderLeft: '4px solid var(--primary)' }}>
            <span className="stats-label">Weekly Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="stats-value" style={{ color: 'var(--primary)' }}>₹{revenueStats.weeklyRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="stats-card stats-total" style={{ borderLeft: '4px solid var(--accent)' }}>
            <span className="stats-label">Monthly Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="stats-value" style={{ color: 'var(--accent)' }}>₹{revenueStats.monthlyRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="stats-card stats-pending" style={{ borderLeft: '4px solid var(--warning)' }}>
            <span className="stats-label">Total Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="stats-value" style={{ color: 'var(--warning)' }}>₹{revenueStats.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Stats & Simple Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 20 }}>
          {/* Revenue Trend Chart */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue Trends</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '140px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.todayRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.todayRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--success)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600 }}>Today</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.weeklyRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.weeklyRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--primary)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600 }}>Weekly</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.monthlyRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.monthlyRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--accent)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600 }}>Monthly</span>
              </div>
            </div>
          </div>

          {/* Payment Status Distribution Chart */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Payment Status Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Completed ({revenueStats.completedPayments})</span>
                  <strong>{Math.round((revenueStats.completedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.completedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: 'var(--success)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Pending ({revenueStats.pendingPayments})</span>
                  <strong>{Math.round((revenueStats.pendingPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.pendingPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: 'var(--warning)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Failed ({revenueStats.failedPayments})</span>
                  <strong>{Math.round((revenueStats.failedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.failedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: '#ef4444' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main verification table */}
      <section style={{ textAlign: 'left', marginTop: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>Pending Provider Applications</h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map((n) => (
              <div key={n} className="skeleton-card" style={{ height: 140 }}>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
              All applications have been reviewed. There are no pending verification requests at this time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {providers.map((provider, index) => (
              <article
                key={provider.provider_id}
                className="card animate-fade-up"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  borderLeft: '4px solid var(--warning)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{provider.name}</h3>
                    <p style={{ fontSize: 13, margin: '2px 0 0 0', color: 'var(--text-muted)' }}>
                      Contact: <strong>{provider.email}</strong> &bull; {provider.phone || 'No phone number'}
                    </p>
                  </div>
                  <span className="badge badge-warning">
                    {provider.category_name}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 14, marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)', fontWeight: 600 }}>Service Description</p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)', lineHeight: 1.4 }}>{provider.description || 'Not provided'}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)', fontWeight: 600 }}>Experience Level</p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>{provider.experience} Years Active</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, margin: '0 0 2px 0', color: 'var(--text-main)', fontWeight: 600 }}>Coverage Area</p>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>
                      {provider.working_area}, {provider.city} &bull; {provider.pincode}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, borderTop: '1px dashed var(--border-color)', paddingTop: 14 }}>
                  <button
                    disabled={updatingId === provider.provider_id}
                    onClick={() => updateVerification(provider.provider_id, 'verified')}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FaCheckCircle /> Approve Partner
                  </button>

                  <button
                    disabled={updatingId === provider.provider_id}
                    onClick={() => updateVerification(provider.provider_id, 'rejected')}
                    className="btn-danger"
                    style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FaTimesCircle /> Decline Application
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

export default AdminDashboard;
