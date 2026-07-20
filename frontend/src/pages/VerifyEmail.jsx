import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GlassButton from '../components/ui/GlassButton';
import { FaCheckCircle, FaCompass, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium VerifyEmail screen.
 * Uses Framer Motion transitions and custom glass components.
 */
const VerifyEmail = () => {
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    if (redirectCountdown <= 0) {
      navigate('/login');
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate]);

  return (
    <motion.div 
      className="auth-split-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left Decorative Branding Pane */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaCompass style={{ fontSize: 24 }} />
          <span>LocalServe</span>
        </div>
        
        <div className="auth-branding-content">
          <h1 className="auth-branding-title">
            LocalServe Account Portal
          </h1>
          <p className="auth-branding-text">
            Connecting you instantly with trusted professionals in your area. Simple booking, secure payments.
          </p>
        </div>

        {/* Floating Icons */}
        <div className="auth-floating-cards">
          <div className="floating-service-chip chip-1">
            <FaBolt style={{ color: '#fbbf24' }} /> Electrician
          </div>
          <div className="floating-service-chip chip-2">
            <FaWrench style={{ color: '#60a5fa' }} /> Plumber
          </div>
          <div className="floating-service-chip chip-3">
            <FaBroom style={{ color: '#34d399' }} /> Cleaning
          </div>
          <div className="floating-service-chip chip-4">
            <FaPaintRoller style={{ color: '#f472b6' }} /> Painter
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 5, fontSize: '0.85rem', color: 'var(--text-light)' }}>
          © 2026 LocalServe Marketplace. All rights reserved.
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="auth-form-panel">
        <motion.div 
          className="auth-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="auth-logo-mobile">
            <FaCompass style={{ fontSize: 24 }} />
            <span>LocalServe</span>
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Email Verification</h2>
            <p className="auth-card-subtitle">Activating your marketplace access</p>
          </header>

          <div style={{ padding: '20px 0' }}>
            <FaCheckCircle style={{ color: 'var(--success)', fontSize: '3.5rem', marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginBottom: 10, background: 'none', WebkitTextFillColor: 'initial' }}>
              Verification Complete
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Email verification is completed. Your account is active and ready.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>
              <span>Redirecting to Login in {redirectCountdown}...</span>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.2)', borderTopColor: 'var(--accent)', animation: 'shimmer 1s linear infinite' }} />
            </div>

            <GlassButton
              onClick={() => navigate('/login')}
              variant="primary"
              style={{ width: '100%' }}
            >
              Go to Login Now
            </GlassButton>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default VerifyEmail;
