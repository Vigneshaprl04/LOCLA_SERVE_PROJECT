import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';
import GlobalLayout from './layout/GlobalLayout';
import Footer from './layout/Footer';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 15, color: 'var(--text-muted)', backgroundColor: '#050816' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading LocalServe...</p>
      </div>
    );
  }

  return user ? (
    <GlobalLayout>
      <Navbar />
      <div style={{ flex: 1, width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
        <Outlet />
      </div>
      <Footer />
    </GlobalLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;
