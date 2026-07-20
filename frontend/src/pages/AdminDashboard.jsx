import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { 
  FaUserCheck, 
  FaUserClock, 
  FaUsers, 
  FaExclamationCircle, 
  FaDownload, 
  FaBars, 
  FaChevronRight, 
  FaCalendarAlt, 
  FaHistory, 
  FaCog, 
  FaLock, 
  FaBriefcase, 
  FaFileInvoiceDollar, 
  FaSearch, 
  FaFilter,
  FaShieldAlt,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaRobot
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Enterprise Admin Portal Redesign & Enhancement.
 * Styled after Stripe, Linear, and Vercel dashboards.
 * Complies with strict data policy (no mock data, empty states for missing APIs).
 */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sidebar Layout State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data States
  const [pendingProviders, setPendingProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState('');
  const [updatingProviderId, setUpdatingProviderId] = useState(null);

  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [complaintsError, setComplaintsError] = useState('');
  const [resolvingComplaintId, setResolvingComplaintId] = useState(null);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState('');

  // Dashboard Stats States
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // AI insights states
  const [aiInsights, setAiInsights] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  // Recent Operations (Current Session) State
  const [recentOperations, setRecentOperations] = useState([]);

  // Payments Filtering & Pagination
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const paymentsPerPage = 10;

  // Helper to log current session events
  const logOperation = useCallback((title, type = 'System') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRecentOperations(prev => [
      {
        id: Date.now() + Math.random().toString(),
        title,
        timestamp,
        type
      },
      ...prev
    ]);
  }, []);

  // API Call Abort controllers container
  const abortControllers = useMemo(() => new Set(), []);

  const createAbortSignal = useCallback(() => {
    const controller = new AbortController();
    abortControllers.add(controller);
    return controller.signal;
  }, [abortControllers]);

  // Authorization Check
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      // Graceful Forbidden Access state
      logOperation(`Unauthorized navigation block by ${user.email}`, 'Security');
      navigate('/login');
    }
  }, [user, navigate, logOperation]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllers.forEach(controller => controller.abort());
    };
  }, [abortControllers]);

  // Fetch Pending Providers Queue
  const fetchPendingProviders = useCallback(async () => {
    try {
      setProvidersError('');
      setProvidersLoading(true);
      const signal = createAbortSignal();
      const response = await api.get('/admin/providers/pending', { signal });
      setPendingProviders(response.data.providers || []);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      if (err.response?.status === 401 || err.response?.status === 403) {
        logOperation('Login Redirect (401/403 Unauthorized Access)', 'Auth');
        logout();
        navigate('/login');
        return;
      }
      setProvidersError(err.response?.data?.message || 'Unable to load verification queue');
    } finally {
      setProvidersLoading(false);
    }
  }, [createAbortSignal, logOperation, logout, navigate]);

  // Fetch Financial Analytics
  const fetchFinancialStats = useCallback(async () => {
    try {
      setStatsError('');
      setStatsLoading(true);
      const signal = createAbortSignal();
      const response = await api.get('/payments/dashboard/admin', { signal });
      if (response.data && response.data.stats) {
        setRevenueStats(response.data.stats);
      }
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setStatsError(err.response?.data?.message || 'Unable to load analytics stats');
    } finally {
      setStatsLoading(false);
    }
  }, [createAbortSignal]);

  // Fetch Payments History
  const fetchPayments = useCallback(async () => {
    try {
      setPaymentsError('');
      setPaymentsLoading(true);
      const signal = createAbortSignal();
      const response = await api.get('/payments/history', { signal });
      setPayments(response.data.payments || []);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setPaymentsError(err.response?.data?.message || 'Unable to load payment history ledger');
    } finally {
      setPaymentsLoading(false);
    }
  }, [createAbortSignal]);

  // Fetch Complaints List
  const fetchComplaints = useCallback(async () => {
    try {
      setComplaintsError('');
      setComplaintsLoading(true);
      const signal = createAbortSignal();
      const response = await api.get('/complaints/admin/all', { signal });
      setComplaints(response.data.complaints || []);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setComplaintsError(err.response?.data?.message || 'Unable to load complaints queue');
    } finally {
      setComplaintsLoading(false);
    }
  }, [createAbortSignal]);

  // Fetch AI Insights Overview
  const fetchAiInsights = useCallback(async () => {
    try {
      setInsightsLoading(true);
      setInsightsError('');
      const signal = createAbortSignal();
      const response = await api.get('/ai/admin-insights', { signal });
      if (response.data.success) {
        setAiInsights(response.data.insights || '');
      }
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setInsightsError(err.response?.data?.message || 'Unable to compile platform insights');
    } finally {
      setInsightsLoading(false);
    }
  }, [createAbortSignal]);

  // Aggregate Initial Data Load
  const fetchAllData = useCallback(() => {
    fetchPendingProviders();
    fetchFinancialStats();
    fetchPayments();
    fetchComplaints();
    fetchAiInsights();
  }, [fetchPendingProviders, fetchFinancialStats, fetchPayments, fetchComplaints, fetchAiInsights]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Provider Verification Approval/Rejection Action Handler
  const handleVerifyProvider = async (providerId, status) => {
    const confirmation = window.confirm(
      `Are you sure you want to change this provider status to ${status.toUpperCase()}?`
    );
    if (!confirmation) return;

    try {
      setUpdatingProviderId(providerId);
      await api.patch(`/admin/providers/${providerId}/verification`, { status });
      logOperation(`Provider #${providerId} ${status === 'verified' ? 'Approved' : 'Rejected'}`, status === 'verified' ? 'Approve' : 'Reject');
      
      // Refresh Lists
      fetchPendingProviders();
      fetchFinancialStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update partner verification state');
    } finally {
      setUpdatingProviderId(null);
    }
  };

  // Complaint Resolution status update handler
  const handleResolveComplaint = async (complaintId) => {
    const confirmation = window.confirm('Are you sure you want to mark this complaint ticket as RESOLVED?');
    if (!confirmation) return;

    try {
      setResolvingComplaintId(complaintId);
      await api.patch(`/complaints/admin/${complaintId}/status`, { status: 'resolved' });
      logOperation(`Complaint #${complaintId} Resolved`, 'Complaint');
      
      // Refresh List
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve complaint status');
    } finally {
      setResolvingComplaintId(null);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    try {
      if (payments.length === 0) {
        alert('No payment history records found to export.');
        return;
      }

      const headers = ['Payment ID', 'Booking ID', 'Amount', 'Status', 'User Name', 'Provider Name', 'Created At'];
      const rows = payments.map(p => [
        p.id,
        p.booking_id,
        `₹${p.amount}`,
        p.status,
        p.user_name || 'N/A',
        p.provider_name || 'N/A',
        new Date(p.created_at).toLocaleString()
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `localserve_transactions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logOperation(`Payment report exported`, 'CSV');
    } catch (err) {
      alert('Failed to generate CSV export.');
    }
  };

  // Export PDF / Print Handler
  const handleExportPDF = () => {
    try {
      window.print();
      logOperation(`Payment report printed/exported`, 'PDF');
    } catch (err) {
      alert('Failed to generate PDF snapshot print.');
    }
  };

  // Filtered Payments computation
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        (p.invoice_number && p.invoice_number.toLowerCase().includes(paymentSearch.toLowerCase())) ||
        (p.booking_id && p.booking_id.toString().includes(paymentSearch)) ||
        (p.user_name && p.user_name.toLowerCase().includes(paymentSearch.toLowerCase())) ||
        (p.provider_name && p.provider_name.toLowerCase().includes(paymentSearch.toLowerCase()));
      
      const matchesStatus = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, paymentSearch, paymentStatusFilter]);

  // Paginated Payments computation
  const paginatedPayments = useMemo(() => {
    const startIndex = (paymentCurrentPage - 1) * paymentsPerPage;
    return filteredPayments.slice(startIndex, startIndex + paymentsPerPage);
  }, [filteredPayments, paymentCurrentPage]);

  const totalPaymentPages = Math.ceil(filteredPayments.length / paymentsPerPage);

  // SVG Chart rendering data prep (Safe from crashing)
  const chartPoints = useMemo(() => {
    const values = [
      revenueStats.todayRevenue || 0,
      revenueStats.weeklyRevenue || 0,
      revenueStats.monthlyRevenue || 0,
      revenueStats.totalRevenue || 0
    ];
    const maxVal = Math.max(...values, 100);
    
    // Calculate coordinates on a viewBox of 500x150
    const padding = 30;
    const chartHeight = 150 - padding * 2;
    const chartWidth = 500 - padding * 2;

    return values.map((val, index) => {
      const x = padding + (index * (chartWidth / (values.length - 1)));
      const y = 150 - padding - ((val / maxVal) * chartHeight);
      return { x, y, value: val, label: ['Today', 'Weekly', 'Monthly', 'Cumulative'][index] };
    });
  }, [revenueStats]);

  const isChartDataAvailable = useMemo(() => {
    return revenueStats.todayRevenue > 0 || 
           revenueStats.weeklyRevenue > 0 || 
           revenueStats.monthlyRevenue > 0 || 
           revenueStats.totalRevenue > 0;
  }, [revenueStats]);

  // Common Contextual Empty State Component
  const ContextualEmptyState = ({ title }) => (
    <GlassCard hoverLift={false} style={{ padding: '48px 24px', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <FaExclamationCircle size={40} style={{ color: 'var(--text-light)', marginBottom: 16, opacity: 0.5 }} />
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-main)' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '420px', lineHeight: 1.6 }}>
        No backend endpoint is currently available for this feature.
        <br />
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>This module is ready</span> and will automatically display data once the corresponding API is implemented.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24, width: '100%', maxWidth: '300px' }}>
        <input 
          disabled 
          type="text" 
          placeholder="Search disabled..." 
          style={{ 
            width: '100%', 
            padding: '10px 14px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--glass-border)', 
            background: 'rgba(255,255,255,0.02)', 
            color: 'var(--text-light)',
            cursor: 'not-allowed'
          }} 
        />
        <button 
          disabled 
          style={{ 
            padding: '10px 20px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--glass-border)', 
            background: 'rgba(255,255,255,0.05)', 
            color: 'var(--text-light)',
            cursor: 'not-allowed'
          }}
        >
          Filter
        </button>
      </div>
    </GlassCard>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', boxSizing: 'border-box' }}>
      
      {/* Premium Sidebar Navigation Panel (Collapsible) */}
      <aside 
        style={{
          width: sidebarCollapsed ? '80px' : '260px',
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderRight: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width var(--transition-normal)',
          zIndex: 40,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        className="navbar-links"
      >
        <div style={{ padding: '24px 16px' }}>
          
          {/* Logo Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'var(--gradient-text)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              <FaLock size={18} style={{ color: '#ffffff' }} />
            </div>
            {!sidebarCollapsed && (
              <span style={{ fontSize: '1.25rem', fontWeight: 900, background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', whiteSpace: 'nowrap' }}>
                LocalServe HQ
              </span>
            )}
          </div>

          {/* Navigation Links list */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: FaHistory },
              { id: 'users', label: 'Users', icon: FaUsers },
              { id: 'providers', label: 'Providers', icon: FaUserCheck },
              { id: 'bookings', label: 'Bookings', icon: FaBriefcase },
              { id: 'payments', label: 'Payments', icon: FaFileInvoiceDollar },
              { id: 'complaints', label: 'Complaints', icon: FaExclamationCircle },
              { id: 'reviews', label: 'Reviews', icon: FaUserClock },
              { id: 'notifications', label: 'Notifications', icon: FaUsers },
              { id: 'settings', label: 'Settings', icon: FaCog },
              { id: 'security', label: 'Security', icon: FaShieldAlt },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                    color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.92rem',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)'
                  }}
                  title={item.label}
                >
                  <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'inherit', flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Collapsible toggle & logout buttons footer */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-sidebar-active)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {sidebarCollapsed ? '→' : '← Collapse'}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
            title="Logout"

          >
            <FaSignOutAlt size={16} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Burger Menu Button */}
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 50,
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(10, 15, 30, 0.8)',
          border: '1px solid var(--glass-border)',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'none'
        }}
        className="mobile-burger-btn"
      >
        <FaBars size={18} />
      </button>

      {/* Mobile navigation side drawer overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: '260px',
              background: 'var(--bg-mobile-menu)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderRight: '1px solid var(--glass-border)',
              zIndex: 49,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px 16px',
              boxSizing: 'border-box'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--gradient-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaLock size={18} style={{ color: '#ffffff' }} /></div>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>LocalServe HQ</span>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: FaHistory },
                  { id: 'users', label: 'Users', icon: FaUsers },
                  { id: 'providers', label: 'Providers', icon: FaUserCheck },
                  { id: 'bookings', label: 'Bookings', icon: FaBriefcase },
                  { id: 'payments', label: 'Payments', icon: FaFileInvoiceDollar },
                  { id: 'complaints', label: 'Complaints', icon: FaExclamationCircle },
                  { id: 'reviews', label: 'Reviews', icon: FaUserClock },
                  { id: 'notifications', label: 'Notifications', icon: FaUsers },
                  { id: 'settings', label: 'Settings', icon: FaCog },
                  { id: 'security', label: 'Security', icon: FaShieldAlt },
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                        color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame */}
      <main style={{ flex: 1, padding: '40px', boxSizing: 'border-box', overflowY: 'auto', textAlign: 'left' }} className="admin-main-content">
        
        {/* Top Header / Breadcrumb segment */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Admin</span>
            <FaChevronRight size={8} />
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activeTab}</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            HQ Control Panel
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Logged in as: <strong style={{ color: 'var(--text-main)' }}>{user?.name || 'System Administrator'}</strong>
          </p>
        </header>

        {/* Tab workspace router */}
        <div style={{ position: 'relative' }}>
          
          {/* TAB 1: DASHBOARD ANALYTICS */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              
              {/* AI Platform Insights Section */}
              <GlassCard hoverLift={false} style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(6, 182, 212, 0.25)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <FaRobot style={{ color: 'var(--accent)', fontSize: '1.2rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>AI Platform Auditor & Anomalies Summary</h3>
                </div>
                {insightsLoading ? (
                  <Loader size={20} text="Compiling engine statistics..." />
                ) : insightsError ? (
                  <span style={{ fontSize: '0.85rem', color: '#fca5a5' }}>{insightsError}</span>
                ) : (
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    {aiInsights || "Initializing platform summaries..."}
                  </p>
                )}
              </GlassCard>

              {/* Financial KPI stats grid */}
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>Financial Performance</h2>
              
              {statsLoading ? (
                <div style={{ padding: '24px 0' }}><Loader text="Updating analytics metrics..." /></div>
              ) : statsError ? (
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)', color: '#fca5a5', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{statsError}</span>
                  <GlassButton onClick={fetchFinancialStats} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Retry Load</GlassButton>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Today's Revenue</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)', margin: '8px 0 0 0' }}>₹{(revenueStats.todayRevenue || 0).toFixed(2)}</h3>
                  </GlassCard>
                  <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weekly Revenue</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-light)', margin: '8px 0 0 0' }}>₹{(revenueStats.weeklyRevenue || 0).toFixed(2)}</h3>
                  </GlassCard>
                  <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Revenue</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent)', margin: '8px 0 0 0' }}>₹{(revenueStats.monthlyRevenue || 0).toFixed(2)}</h3>
                  </GlassCard>
                  <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gross Revenue</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', margin: '8px 0 0 0' }}>₹{(revenueStats.totalRevenue || 0).toFixed(2)}</h3>
                  </GlassCard>
                </div>
              )}

              {/* Grid: Charts & Operations logger */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', alignItems: 'start' }} className="dashboard-layout-grid">
                
                {/* SVG Revenue Chart */}
                <GlassCard hoverLift={false} style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)' }}>Revenue Growth Curves</h3>
                  
                  {!isChartDataAvailable ? (
                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                      Not enough historical data to generate a trend.
                    </div>
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <svg viewBox="0 0 500 150" style={{ width: '100%', height: 'auto', overflow: 'visible' }} aria-label="Revenue Growth Trend Chart">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Grid lines */}
                        <line x1="30" y1="30" x2="470" y2="30" stroke="var(--glass-border)" strokeDasharray="4 4" />
                        <line x1="30" y1="75" x2="470" y2="75" stroke="var(--glass-border)" strokeDasharray="4 4" />
                        <line x1="30" y1="120" x2="470" y2="120" stroke="var(--glass-border)" strokeDasharray="4 4" />

                        {/* Area Gradient under curve */}
                        <path 
                          d={`M ${chartPoints[0].x} 120 
                              L ${chartPoints[0].x} ${chartPoints[0].y} 
                              ${chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} 
                              L ${chartPoints[chartPoints.length - 1].x} 120 Z`} 
                          fill="url(#chartGradient)" 
                        />

                        {/* Chart Line path */}
                        <path 
                          d={chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} 
                          fill="none" 
                          stroke="var(--accent)" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                        />

                        {/* Render dots and coordinate values */}
                        {chartPoints.map((p, idx) => (
                          <g key={idx}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="var(--accent)" strokeWidth="2.5" />
                            <text x={p.x} y={p.y - 12} fontSize="10" fontWeight="bold" fill="var(--text-main)" textAnchor="middle">
                              ₹{p.value.toFixed(0)}
                            </text>
                            <text x={p.x} y="138" fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  )}

                  {/* Transaction Outcome Distribution */}
                  <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Outcome Success Ratios</h4>
                    <div style={{ height: '24px', display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      {[
                        { label: 'Completed', val: revenueStats.completedPayments, color: 'var(--success)' },
                        { label: 'Pending', val: revenueStats.pendingPayments, color: 'var(--warning)' },
                        { label: 'Failed', val: revenueStats.failedPayments, color: 'var(--error)' }
                      ].map((item, idx) => {
                        const total = (revenueStats.completedPayments || 0) + (revenueStats.pendingPayments || 0) + (revenueStats.failedPayments || 0) || 1;
                        const pct = (item.val / total) * 100;
                        if (pct === 0) return null;
                        return (
                          <div 
                            key={idx} 
                            style={{ width: `${pct}%`, backgroundColor: item.color, height: '100%' }} 
                            title={`${item.label}: ${item.val} (${Math.round(pct)}%)`} 
                          />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} /> Completed ({revenueStats.completedPayments || 0})</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} /> Pending ({revenueStats.pendingPayments || 0})</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--error)' }} /> Failed ({revenueStats.failedPayments || 0})</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Recent Operations log */}
                <GlassCard hoverLift={false} style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Recent Operations (Current Session)</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Displays actions performed during the current browser session. This history is NOT persistent.</p>
                  
                  {recentOperations.length === 0 ? (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                      No actions recorded in current session.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                      {recentOperations.map(op => (
                        <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>✓ {op.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{op.timestamp} &bull; {op.type}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', height: 'fit-content', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-light)' }}>
                            Just now
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* API Unavailable placeholder grid for counts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '32px' }}>
                <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>User Database Metrics</span>
                  <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    User counts & profiles are not available.
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Endpoint /api/users/all missing.</span>
                  </p>
                </GlassCard>
                <GlassCard hoverLift={false} style={{ padding: '24px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Duty Booking Stats</span>
                  <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Real-time bookings analytics are unavailable.
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Endpoint /api/bookings/admin missing.</span>
                  </p>
                </GlassCard>
              </div>

            </motion.div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ContextualEmptyState title="User Management Console" />
            </motion.div>
          )}

          {/* TAB 3: PROVIDERS */}
          {activeTab === 'providers' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              
              {/* verification request queue */}
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>Verification Queue (Pending Applications)</h2>
              
              {providersLoading ? (
                <div style={{ padding: '24px 0' }}><Loader text="Loading applicants..." /></div>
              ) : providersError ? (
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{providersError}</span>
                  <GlassButton onClick={fetchPendingProviders} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Retry Load</GlassButton>
                </div>
              ) : pendingProviders.length === 0 ? (
                <GlassCard hoverLift={false} style={{ padding: '48px 20px', textAlign: 'center', marginBottom: 40 }}>
                  <FaUserCheck size={32} style={{ color: 'var(--success)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                    All applicant forms checked. There are no pending provider verification requests.
                  </p>
                </GlassCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                  {pendingProviders.map(p => (
                    <GlassCard key={p.provider_id} hoverLift={true} style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>{p.name}</h3>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Email: {p.email} &bull; Phone: {p.phone || 'N/A'}</span>
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>{p.category_name}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: '1px solid var(--glass-border)', paddingTop: 16, marginBottom: 16 }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Description</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description || 'N/A'}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Experience</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.experience} Years Active</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Coverage City</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.city} &bull; Pin: {p.pincode}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', borderTop: '1px dashed var(--glass-border)', paddingTop: 16 }}>
                        <GlassButton 
                          disabled={updatingProviderId === p.provider_id} 
                          onClick={() => handleVerifyProvider(p.provider_id, 'verified')} 
                          variant="primary" 
                          style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                        >
                          Approve Application
                        </GlassButton>
                        <GlassButton 
                          disabled={updatingProviderId === p.provider_id} 
                          onClick={() => handleVerifyProvider(p.provider_id, 'rejected')} 
                          variant="danger" 
                          style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                        >
                          Decline Application
                        </GlassButton>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* General Providers database tab showing contextual empty state */}
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>Providers Directory Database</h2>
              <ContextualEmptyState title="Providers Directory Database" />

            </motion.div>
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === 'bookings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ContextualEmptyState title="Global Booking Registry" />
            </motion.div>
          )}

          {/* TAB 5: PAYMENTS */}
          {activeTab === 'payments' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Transaction History Ledger</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <GlassButton onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}>
                    <FaDownload size={12} /> Export CSV
                  </GlassButton>
                  <GlassButton onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}>
                    <FaDownload size={12} /> Export PDF
                  </GlassButton>
                </div>
              </div>

              {/* Filters toolbar panel */}
              <GlassCard hoverLift={false} style={{ padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <FaSearch size={14} style={{ color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search by invoice, customer, booking ID..." 
                      value={paymentSearch} 
                      onChange={(e) => {
                        setPaymentSearch(e.target.value);
                        setPaymentCurrentPage(1);
                      }}
                      style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', width: '100%', fontSize: '0.875rem' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <FaFilter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => {
                        setPaymentStatusFilter(e.target.value);
                        setPaymentCurrentPage(1);
                      }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="all" style={{ background: '#0f172a' }}>All Statuses</option>
                      <option value="completed" style={{ background: '#0f172a' }}>Completed</option>
                      <option value="pending" style={{ background: '#0f172a' }}>Pending</option>
                      <option value="failed" style={{ background: '#0f172a' }}>Failed</option>
                    </select>
                  </div>
                </div>
              </GlassCard>

              {/* Transactions Ledger Data Table */}
              {paymentsLoading ? (
                <div style={{ padding: '24px 0' }}><Loader text="Loading ledger transactions..." /></div>
              ) : paymentsError ? (
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{paymentsError}</span>
                  <GlassButton onClick={fetchPayments} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Retry Load</GlassButton>
                </div>
              ) : filteredPayments.length === 0 ? (
                <GlassCard hoverLift={false} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <FaFileInvoiceDollar size={32} style={{ color: 'var(--text-light)', marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                    No payment history matches search or filter criteria.
                  </p>
                </GlassCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                          <th style={{ padding: '16px' }}>Invoice ID</th>
                          <th style={{ padding: '16px' }}>Booking ID</th>
                          <th style={{ padding: '16px' }}>Amount</th>
                          <th style={{ padding: '16px' }}>Status</th>
                          <th style={{ padding: '16px' }}>Customer</th>
                          <th style={{ padding: '16px' }}>Provider</th>
                          <th style={{ padding: '16px' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPayments.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background var(--transition-fast)' }} onMouseEnter={(e)=>e.currentTarget.style.background="rgba(255,255,255,0.015)"} onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding: '16px', fontWeight: 600 }}>{p.invoice_number || `INV-${p.id}`}</td>
                            <td style={{ padding: '16px' }}>#{p.booking_id}</td>
                            <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-main)' }}>₹{p.amount}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: 'var(--radius-sm)', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                background: p.status === 'completed' ? 'rgba(34, 197, 94, 0.12)' : p.status === 'pending' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: p.status === 'completed' ? 'var(--success)' : p.status === 'pending' ? 'var(--warning)' : 'var(--error)'
                              }}>
                                {p.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>{p.user_name || 'System User'}</td>
                            <td style={{ padding: '16px' }}>{p.provider_name || 'System Provider'}</td>
                            <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer bar */}
                  {totalPaymentPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Showing page {paymentCurrentPage} of {totalPaymentPages} ({filteredPayments.length} entries)
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={paymentCurrentPage === 1}
                          onClick={() => setPaymentCurrentPage(prev => prev - 1)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-main)',
                            cursor: paymentCurrentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: paymentCurrentPage === 1 ? 0.4 : 1
                          }}
                        >
                          Previous
                        </button>
                        <button
                          disabled={paymentCurrentPage === totalPaymentPages}
                          onClick={() => setPaymentCurrentPage(prev => prev + 1)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-main)',
                            cursor: paymentCurrentPage === totalPaymentPages ? 'not-allowed' : 'pointer',
                            opacity: paymentCurrentPage === totalPaymentPages ? 0.4 : 1
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 6: COMPLAINTS */}
          {activeTab === 'complaints' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>Platform Complaints Resolution Queue</h2>

              {complaintsLoading ? (
                <div style={{ padding: '24px 0' }}><Loader text="Loading complaint tickets..." /></div>
              ) : complaintsError ? (
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{complaintsError}</span>
                  <GlassButton onClick={fetchComplaints} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Retry Load</GlassButton>
                </div>
              ) : complaints.length === 0 ? (
                <GlassCard hoverLift={false} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <FaUserCheck size={32} style={{ color: 'var(--success)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                    All complaints resolved. There are no pending complaints at this time.
                  </p>
                </GlassCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {complaints.map(c => (
                    <GlassCard key={c.id} hoverLift={true} style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Complaint Ticket #{c.id}</h3>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Created by Customer: <strong>{c.customer_name || c.user_name || `User ID: ${c.user_id}`}</strong> &bull; Date: {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 'var(--radius-sm)', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          background: c.status === 'resolved' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                          color: c.status === 'resolved' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Description of Issue</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{c.description}</p>
                      </div>

                      {c.status !== 'resolved' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px dashed var(--glass-border)', paddingTop: 16 }}>
                          <GlassButton 
                            disabled={resolvingComplaintId === c.id} 
                            onClick={() => handleResolveComplaint(c.id)} 
                            variant="primary" 
                            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                          >
                            Mark ticket as Resolved
                          </GlassButton>
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 7: REVIEWS */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ContextualEmptyState title="Reviews Moderation Panel" />
            </motion.div>
          )}

          {/* TAB 8: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ContextualEmptyState title="Broadcast Communications Dashboard" />
            </motion.div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ContextualEmptyState title="System Configurations & Parameters" />
            </motion.div>
          )}

          {/* TAB 10: SECURITY */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <GlassCard hoverLift={false} style={{ padding: '48px 24px', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <FaShieldAlt size={40} style={{ color: 'var(--text-light)', marginBottom: 16, opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-main)' }}>Security Logs</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '420px', lineHeight: 1.6 }}>
                  Audit log API is not currently available.
                  <br />
                  This section will automatically display server-side security events once backend support is implemented.
                </p>
              </GlassCard>
            </motion.div>
          )}

        </div>

      </main>

      {/* Embedded CSS rules for admin layouts */}
      <style>{`
        @media (max-width: 991px) {
          .navbar-links {
            display: none !important;
          }
          .mobile-burger-btn {
            display: block !important;
          }
          .admin-main-content {
            padding: 80px 24px 24px 24px !important;
          }
        }
        @media (max-width: 768px) {
          .dashboard-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
        table th, table td {
          border: none;
        }
        .badge-warning {
          background-color: rgba(234, 179, 8, 0.12) !important;
          color: var(--warning) !important;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
      `}</style>

    </div>
  );
};

export default AdminDashboard;

