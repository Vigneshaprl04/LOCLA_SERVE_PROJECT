import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

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
    <div className="auth-split-container">
      {/* Left Branding Pane */}
      <div className="auth-branding-panel">
        <div className="decor-shape decor-1"></div>
        <div className="decor-shape decor-2"></div>
        
        <div className="auth-brand-logo">
          <FaBolt style={{ color: 'var(--accent)' }} />
          LocalServe
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
          <div className="floating-service-chip chip-1 animate-float-slow-1">
            <FaBolt style={{ color: '#fbbf24' }} /> Electrician
          </div>
          <div className="floating-service-chip chip-2 animate-float-slow-2">
            <FaWrench style={{ color: '#60a5fa' }} /> Plumber
          </div>
          <div className="floating-service-chip chip-3 animate-float-slow-1">
            <FaBroom style={{ color: '#34d399' }} /> Cleaning
          </div>
          <div className="floating-service-chip chip-4 animate-float-slow-2">
            <FaPaintRoller style={{ color: '#f472b6' }} /> Painter
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 5, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          © 2026 LocalServe Marketplace. All rights reserved.
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="auth-form-panel">
        <div className="auth-card animate-fade-up" style={{ textAlign: 'center' }}>
          <div className="auth-logo-mobile">
            <FaBolt style={{ marginRight: 8 }} /> LocalServe
          </div>
          
          <header className="auth-header">
            <h2 className="auth-card-title">Email Verification</h2>
            <p className="auth-card-subtitle">Activating your marketplace access</p>
          </header>

          <div style={{ padding: '20px 0' }}>
            <FaCheckCircle style={{ color: '#10b981', fontSize: '3rem', marginBottom: 15 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>Verification No Longer Required</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Email verification is disabled. Your account is active and ready.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 25 }}>
              <span>Redirecting to Login in {redirectCountdown}...</span>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.2)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            </div>

            <Link to="/login" className="btn-primary" style={{ display: 'block', padding: '12px', textDecoration: 'none' }}>
              Go to Login Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
