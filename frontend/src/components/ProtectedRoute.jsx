import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 15, color: 'var(--text-muted)' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading LocalServe...</p>
      </div>
    );
  }

  return user ? (
    <>
      <Navbar />
      <Outlet />
    </>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;
