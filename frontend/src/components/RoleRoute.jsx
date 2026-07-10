import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'user') {
      return <Navigate to="/user/home" replace />;
    }

    if (user.role === 'provider') {
      return <Navigate to="/provider/dashboard" replace />;
    }

    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoleRoute;
