import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaUserCheck, FaUserClock, FaUsers, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium AdminDashboard screen.
 * Integrates overview metrics, verification queues, and financial graphs.
 */
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
      await fetchDashboardData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to update provider verification'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && providers.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Opening admin control panel..." />
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
          Admin Control Center
        </h1>
        <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Welcome back, {user?.name || 'System Administrator'}</p>
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

      {/* Overview Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 30 }}>
        
        <GlassCard hoverLift={false} style={{ padding: 24 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Platform Registrants</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>84</span>
            <FaUsers size={22} style={{ color: 'var(--accent)' }} />
          </div>
        </GlassCard>

        <GlassCard hoverLift={false} style={{ padding: 24 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Specialists</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)' }}>21</span>
            <FaUserCheck size={22} style={{ color: 'var(--success)' }} />
          </div>
        </GlassCard>

        <GlassCard hoverLift={false} style={{ padding: 24 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verification Queue</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: providers.length > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
              {providers.length}
            </span>
            <FaUserClock size={22} style={{ color: 'var(--warning)' }} />
          </div>
        </GlassCard>

        <GlassCard hoverLift={false} style={{ padding: 24 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open Disputes</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--error)' }}>0</span>
            <FaExclamationCircle size={22} style={{ color: 'var(--error)' }} />
          </div>
        </GlassCard>

      </div>

      {/* Financial Overview stats grid */}
      <section style={{ textAlign: 'left', marginTop: 32, marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 20, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Financial Overview</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>
          
          <GlassCard hoverLift={false} style={{ padding: 24 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Today's Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)' }}>₹{revenueStats.todayRevenue.toFixed(2)}</span>
            </div>
          </GlassCard>

          <GlassCard hoverLift={false} style={{ padding: 24 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weekly Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary-light)' }}>₹{revenueStats.weeklyRevenue.toFixed(2)}</span>
            </div>
          </GlassCard>

          <GlassCard hoverLift={false} style={{ padding: 24 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent)' }}>₹{revenueStats.monthlyRevenue.toFixed(2)}</span>
            </div>
          </GlassCard>

          <GlassCard hoverLift={false} style={{ padding: 24 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gross Total Revenue</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{revenueStats.totalRevenue.toFixed(2)}</span>
            </div>
          </GlassCard>
        </div>

        {/* Detailed Stats & Simple Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Revenue Trend Chart */}
          <GlassCard hoverLift={false} style={{ padding: 28 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 20, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Revenue Trends</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '140px', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.todayRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.todayRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--success)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: 'var(--text-muted)' }}>Today</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.weeklyRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.weeklyRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--primary-light)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: 'var(--text-muted)' }}>Weekly</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>₹{revenueStats.monthlyRevenue.toFixed(0)}</span>
                <div style={{ width: '32px', height: `${Math.max(10, Math.min(100, (revenueStats.monthlyRevenue / (revenueStats.totalRevenue || 1)) * 100))}px`, backgroundColor: 'var(--accent)', borderRadius: '4px 4px 0 0', minHeight: '6px' }}></div>
                <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: 'var(--text-muted)' }}>Monthly</span>
              </div>
            </div>
          </GlassCard>

          {/* Payment Status Distribution Chart */}
          <GlassCard hoverLift={false} style={{ padding: 28 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 20, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Transaction Outcomes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Completed ({revenueStats.completedPayments})</span>
                  <strong style={{ color: 'var(--text-main)' }}>{Math.round((revenueStats.completedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.completedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: 'var(--success)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pending ({revenueStats.pendingPayments})</span>
                  <strong style={{ color: 'var(--text-main)' }}>{Math.round((revenueStats.pendingPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.pendingPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: 'var(--warning)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Failed ({revenueStats.failedPayments})</span>
                  <strong style={{ color: 'var(--text-main)' }}>{Math.round((revenueStats.failedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100)}%</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div style={{ height: '100%', width: `${(revenueStats.failedPayments / (revenueStats.completedPayments + revenueStats.pendingPayments + revenueStats.failedPayments || 1)) * 100}%`, backgroundColor: 'var(--error)' }}></div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Main verification table */}
      <section style={{ textAlign: 'left', marginTop: 12 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 20, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Pending Verification Queue</h2>

        {providers.length === 0 ? (
          <GlassCard hoverLift={false} style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
              All applications checked. There are no pending verification requests at this time.
            </p>
          </GlassCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {providers.map((provider, index) => (
              <motion.div
                key={provider.provider_id}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <GlassCard hoverLift={true}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '4px',
                    backgroundColor: 'var(--warning)',
                    boxShadow: '0 0 10px var(--warning-glow)'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>{provider.name}</h3>
                      <p style={{ fontSize: '0.9rem', margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
                        Contact: <strong>{provider.email}</strong> &bull; {provider.phone || 'No phone number'}
                      </p>
                    </div>
                    <span className="badge badge-warning">
                      {provider.category_name}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, borderTop: '1px solid var(--glass-border)', paddingTop: 16, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 12, margin: '0 0 4px 0', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Service Description</p>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.45 }}>{provider.description || 'Not provided'}</p>
                    </div>

                    <div>
                      <p style={{ fontSize: 12, margin: '0 0 4px 0', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Experience Level</p>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)' }}>{provider.experience} Years Active</p>
                    </div>

                    <div>
                      <p style={{ fontSize: 12, margin: '0 0 4px 0', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Coverage Area</p>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)' }}>
                        {provider.working_area}, {provider.city} &bull; {provider.pincode}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, borderTop: '1px dashed var(--glass-border)', paddingTop: 16 }}>
                    <GlassButton
                      disabled={updatingId === provider.provider_id}
                      onClick={() => updateVerification(provider.provider_id, 'verified')}
                      variant="primary"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      Approve Application
                    </GlassButton>

                    <GlassButton
                      disabled={updatingId === provider.provider_id}
                      onClick={() => updateVerification(provider.provider_id, 'rejected')}
                      variant="danger"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      Decline Application
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      
    </motion.div>
  );
};

export default AdminDashboard;
