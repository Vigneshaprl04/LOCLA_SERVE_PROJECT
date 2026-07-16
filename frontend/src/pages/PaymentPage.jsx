import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { FaArrowLeft, FaShieldAlt, FaCreditCard, FaCheckCircle, FaTimesCircle, FaDownload, FaHistory, FaBan } from 'react-icons/fa';

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
      // Update local state and navigate back
      navigate('/user/bookings');
    } catch (err) {
      setError('Failed to cancel payment process.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-muted)' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading payment details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div style={{ padding: 40, maxWidth: 540, margin: '20px auto', textAlign: 'center' }}>
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>
        <button onClick={() => navigate('/user/bookings')} className="btn-outline">
          <FaArrowLeft /> Back to My Bookings
        </button>
      </div>
    );
  }

  // Calculate pricing breakdown based on backend rules (18% GST)
  const baseAmount = Number(booking.final_price || booking.estimated_price || 0);
  const gstRate = 0.18;
  const gstAmount = baseAmount * gstRate;
  const grandTotal = baseAmount + gstAmount;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
        <button onClick={() => navigate('/user/bookings')} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaArrowLeft /> Back to My Bookings
        </button>
      </div>

      <main className="card animate-fade-up" style={{ textAlign: 'left' }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaShieldAlt size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Payment Checkout</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Booking Reference: #{booking.id}</p>
          </div>
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

        {/* Transaction Summary Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Service Category</span>
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>{booking.category_name}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Service Partner</span>
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>{booking.provider_name}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Job Status</span>
            <span className="badge badge-accent">{booking.booking_status.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Payment Status</span>
            <span className={`badge ${
              booking.payment_status === 'paid' ? 'badge-success' : 
              booking.payment_status === 'failed' ? 'badge-danger' : 'badge-warning'
            }`}>
              {(booking.payment_status || 'pending').toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Subtotal</span>
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>₹{baseAmount.toFixed(2)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>GST (18%)</span>
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>₹{gstAmount.toFixed(2)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Grand Total</span>
            <strong style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
              ₹{grandTotal.toFixed(2)}
            </strong>
          </div>

        </div>

        {booking.payment_status === 'paid' ? (
          <div style={{ textAlign: 'center', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
              <FaCheckCircle size={18} /> Transaction Cleared Successfully
            </div>
            
            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {downloading ? (
                <>
                  <span className="animate-spin">🌀</span> Generating PDF...
                </>
              ) : (
                <>
                  <FaDownload /> Download Invoice PDF
                </>
              )}
            </button>

            <button onClick={() => navigate('/user/bookings')} className="btn-outline" style={{ width: '100%' }}>
              Return to Bookings
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: 14,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {paymentLoading ? (
                <>
                  <span className="animate-spin">🌀</span> Opening Secure Gateway...
                </>
              ) : (
                <>
                  <FaCreditCard /> Pay Securely via Razorpay
                </>
              )}
            </button>

            {booking.payment_status === 'failed' && (
              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="btn-secondary"
                style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FaCreditCard /> Retry Payment
              </button>
            )}

            <button
              onClick={handleCancelPayment}
              disabled={paymentLoading}
              className="btn-outline"
              style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderColor: '#ef4444', color: '#ef4444' }}
            >
              <FaBan /> Cancel Payment
            </button>
          </div>
        )}

        {/* View History Button */}
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FaHistory /> {historyOpen ? 'Hide Payment History' : 'View Payment History'}
          </button>
        </div>

        {/* Payment History List */}
        {historyOpen && (
          <div className="animate-fade-up" style={{ marginTop: 16, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Transactions History</h3>
            {historyLoading ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading history...</p>
            ) : history.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No past transactions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((tx) => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontSize: '13px' }}>
                    <div>
                      <strong style={{ display: 'block' }}>INV No: {tx.invoice_number || 'N/A'}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Date: {new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', color: 'var(--primary)' }}>₹{Number(tx.total_amount).toFixed(2)}</strong>
                      <span className={`badge ${tx.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {tx.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
};

export default PaymentPage;
