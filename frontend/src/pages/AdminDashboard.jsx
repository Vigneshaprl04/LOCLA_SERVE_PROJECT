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

  const fetchPendingProviders = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/admin/providers/pending');
      setProviders(response.data.providers || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to fetch pending providers'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProviders();
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
