import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import Loader from '../components/ui/Loader';
import { FaArrowLeft, FaShieldAlt, FaCreditCard, FaCheckCircle, FaHistory, FaBan, FaDownload } from 'react-icons/fa';
import { motion } from 'framer-motion';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Redesigned Premium Payment Checkout screen.
 * Integrates Razorpay checkout flow, invoice rendering, and trans history.
 */
const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Payment History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/bookings/my');
      const currentBooking = response.data.bookings?.find(
        (item) => Number(item.id) === Number(bookingId)
      );

      if (!currentBooking) {
        setError('Booking record not found');
        return;
      }

      setBooking(currentBooking);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/payments/history');
      setHistory(res.data.payments || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) {
      fetchHistory();
    }
  }, [historyOpen]);

  const handlePayment = async () => {
    try {
      setPaymentLoading(true);
      setError('');
      setMessage('');

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Unable to load Razorpay Payment Gateway. Check your connectivity.');
        return;
      }

      const orderResponse = await api.post('/payments/create-order', {
        booking_id: Number(bookingId),
      });

      const { order, keyId } = orderResponse.data;

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'LocalServe',
        description: `Payment for Service Booking #${bookingId}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            setMessage('Secure authorization completed. Verifying with servers...');

            const verifyResponse = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setMessage(verifyResponse.data.message || 'Payment successfully verified.');
            await fetchBooking();
          } catch (err) {
            setError(err.response?.data?.message || 'Payment signature verification failed.');
          }
        },
        modal: {
          ondismiss: async () => {
            setMessage('Payment transaction cancelled.');
            try {
              await api.post('/payments/cancel', { razorpay_order_id: order.id });
              await fetchBooking();
            } catch (err) {
              console.error("Cancel API error:", err);
            }
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', async (response) => {
        setError(response.error?.description || 'Transaction declined.');
        try {
          await api.post('/payments/fail', {
            razorpay_order_id: order.id,
            razorpay_payment_id: response.error?.metadata?.payment_id,
            error_reason: response.error?.description
          });
          await fetchBooking();
        } catch (err) {
          console.error("Fail API error:", err);
        }
      });

      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to initialize Razorpay checkout.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      setError('');
      const response = await api.get(`/payments/invoice/${bookingId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      setError('Failed to download invoice PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelPayment = async () => {
    try {
      setPaymentLoading(true);
      setError('');
      navigate('/user/bookings');
    } catch (err) {
      setError('Failed to cancel payment process.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Opening secure checkout summary..." />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div style={{ padding: 40, maxWidth: 540, margin: '40px auto', textAlign: 'center' }}>
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>
        <GlassButton onClick={() => navigate('/user/bookings')} variant="outline">
          <FaArrowLeft /> Back to My Bookings
        </GlassButton>
      </div>
    );
  }

  const baseAmount = Number(booking.final_price || booking.estimated_price || 0);
  const gstRate = 0.18;
  const gstAmount = baseAmount * gstRate;
  const grandTotal = baseAmount + gstAmount;

  return (
    <motion.div 
      style={{ maxWidth: '600px', margin: '40px auto', padding: '0 24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
        <GlassButton onClick={() => navigate('/user/bookings')} variant="outline" style={{ padding: '8px 16px' }}>
          <FaArrowLeft /> Back to My Bookings
        </GlassButton>
      </div>

      <main>
        <GlassCard hoverLift={false} style={{ padding: 36, textAlign: 'left' }}>
          
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--glass-border)', paddingBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <FaShieldAlt size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Payment Checkout</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Booking Reference: #{booking.id}</p>
            </div>
          </header>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {message && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              {message}
            </div>
          )}

          {/* Transaction Summary Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Service Category</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{booking.category_name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Service Partner</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{booking.provider_name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Job Status</span>
              <span className="badge badge-accent">{booking.booking_status.toUpperCase()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Payment Status</span>
              <span className={`badge ${
                booking.payment_status === 'paid' ? 'badge-success' : 
                booking.payment_status === 'failed' ? 'badge-danger' : 'badge-warning'
              }`}>
                {(booking.payment_status || 'pending').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Subtotal</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>₹{baseAmount.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>GST (18%)</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>₹{gstAmount.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Grand Total</span>
              <strong style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                ₹{grandTotal.toFixed(2)}
              </strong>
            </div>

          </div>

          {booking.payment_status === 'paid' ? (
            <div style={{ textAlign: 'center', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, marginBottom: 12 }}>
                <FaCheckCircle size={18} /> Transaction Cleared Successfully
              </div>
              
              <GlassButton
                onClick={handleDownloadInvoice}
                disabled={downloading}
                variant="primary"
                style={{ width: '100%' }}
              >
                {downloading ? 'Generating PDF...' : 'Download Invoice PDF'}
              </GlassButton>

              <GlassButton onClick={() => navigate('/user/bookings')} variant="secondary" style={{ width: '100%' }}>
                Return to Bookings
              </GlassButton>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <GlassButton
                onClick={handlePayment}
                disabled={paymentLoading}
                variant="primary"
                style={{ width: '100%' }}
              >
                {paymentLoading ? 'Opening Secure Gateway...' : 'Pay Securely via Razorpay'}
              </GlassButton>

              {booking.payment_status === 'failed' && (
                <GlassButton
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  variant="secondary"
                  style={{ width: '100%' }}
                >
                  Retry Payment
                </GlassButton>
              )}

              <GlassButton
                onClick={handleCancelPayment}
                disabled={paymentLoading}
                variant="danger"
                style={{ width: '100%' }}
              >
                Cancel Payment
              </GlassButton>
            </div>
          )}

          {/* View History Button */}
          <div style={{ marginTop: 24, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
            <GlassButton
              onClick={() => setHistoryOpen(!historyOpen)}
              variant="outline"
              style={{ width: '100%' }}
            >
              {historyOpen ? 'Hide Payment History' : 'View Payment History'}
            </GlassButton>
          </div>

          {/* Payment History List */}
          {historyOpen && (
            <div style={{ marginTop: 16, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', background: 'rgba(5, 5, 10, 0.3)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 12px 0', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>Transaction Log</h3>
              {historyLoading ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Loading history...</p>
              ) : history.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No past transactions found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map((tx) => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', fontSize: '0.85rem' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-main)' }}>INV: {tx.invoice_number || 'N/A'}</strong>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', color: 'var(--accent)' }}>₹{Number(tx.total_amount).toFixed(2)}</strong>
                        <span className={tx.payment_status === 'paid' ? 'badge badge-success' : 'badge badge-danger'} style={{ fontSize: '0.65rem' }}>
                          {tx.payment_status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </GlassCard>
      </main>

    </motion.div>
  );
};

export default PaymentPage;
