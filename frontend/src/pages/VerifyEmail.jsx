import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { FaCheckCircle, FaExclamationTriangle, FaBolt, FaWrench, FaBroom, FaPaintRoller } from 'react-icons/fa';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Resend Form State
  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const doVerification = async () => {
      if (!token) {
        setVerifying(false);
        setError('Verification token is missing from the link.');
        return;
      }

      try {
        await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setSuccess(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to verify email. The link may have expired or is invalid.');
      } finally {
        setVerifying(false);
      }
    };
    doVerification();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendMessage('');
    setResendLoading(true);

    try {
      const res = await api.post('/auth/resend-verification', { email: resendEmail });
      setResendMessage(res.data.message || 'If an account is associated with this email, a new verification link has been sent.');
      setResendEmail('');
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend verification link.');
    } finally {
      setResendLoading(false);
    }
  };

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
            Verify Your LocalServe Account.
          </h1>
          <p className="auth-branding-text">
            Confirming your email address ensures secure bookings, real-time chats, and verified customer reviews.
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

          {verifying ? (
            <div style={{ padding: '30px 0' }}>
              <span className="animate-spin" style={{ display: 'inline-block', fontSize: '2.5rem', marginBottom: 15 }}>🌀</span>
              <p style={{ fontWeight: 600 }}>Verifying your email address. Please wait...</p>
            </div>
          ) : success ? (
            <div style={{ padding: '20px 0' }}>
              <FaCheckCircle style={{ color: '#10b981', fontSize: '3rem', marginBottom: 15 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>Email Verified Successfully!</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 25 }}>Your account is now active and fully verified.</p>
              <Link to="/login" className="btn-primary" style={{ display: 'block', padding: '12px', textDecoration: 'none' }}>
                Go to Login
              </Link>
            </div>
          ) : (
            <div style={{ padding: '10px 0' }}>
              <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '3rem', marginBottom: 15 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>Verification Failed</h3>
              <div className="alert alert-danger" style={{ marginBottom: 25, textAlign: 'left' }}>
                {error}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e4e4e4', margin: '25px 0' }} />

              <header className="auth-header" style={{ marginBottom: 15 }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 5px 0', textAlign: 'left' }}>Resend Verification Link</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'left' }}>Enter your email address to request a new link.</p>
              </header>

              {resendMessage && (
                <div className="alert alert-success animate-fade-in" style={{ marginBottom: 15, textAlign: 'left' }}>
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div className="alert alert-danger animate-shake" style={{ marginBottom: 15, textAlign: 'left' }}>
                  {resendError}
                </div>
              )}

              <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="form-control"
                    disabled={resendLoading}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px', marginTop: 5 }}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <>
                      <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>🌀</span>
                      Resending...
                    </>
                  ) : 'Send Verification Email'}
                </button>
              </form>

              <div style={{ marginTop: 25 }}>
                <Link to="/login" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
