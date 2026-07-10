import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'user') {
        navigate('/user/home');
      } else if (user.role === 'provider') {
        navigate('/provider/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      }
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 12px auto' }}></div>
      <p>Loading your experience...</p>
    </div>
  );
};

export default Home;
