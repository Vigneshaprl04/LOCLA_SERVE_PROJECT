import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { FaArrowLeft, FaShieldAlt, FaCreditCard, FaCheckCircle } from 'react-icons/fa';

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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
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

    fetchBooking();
  }, [bookingId]);

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

            setTimeout(() => {
              navigate('/user/bookings');
            }, 1500);
          } catch (err) {
            setError(err.response?.data?.message || 'Payment signature verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setMessage('Payment transaction cancelled.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        setError(response.error?.description || 'Transaction declined.');
      });

      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to initialize Razorpay checkout.');
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

  return (
    <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
        <button onClick={() => navigate('/user/bookings')} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaArrowLeft /> Back to My Bookings
        </button>
      </div>

      <main className="card animate-fade-up" style={{ textAlign: 'left' }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <FaShieldAlt size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Complete Payment</h1>
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
            <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
              {booking.payment_status.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Amount Payable</span>
            <strong style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
              ₹{booking.final_price || booking.estimated_price}
            </strong>
          </div>

        </div>

        {booking.payment_status === 'paid' ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, marginBottom: 16 }}>
              <FaCheckCircle size={18} /> Transaction Cleared Successfully
            </div>
            <button onClick={() => navigate('/user/bookings')} className="btn-primary" style={{ width: '100%' }}>
              Return to Bookings
            </button>
          </div>
        ) : (
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
        )}

      </main>

    </div>
  );
};

export default PaymentPage;
