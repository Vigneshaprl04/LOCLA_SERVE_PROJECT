import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaComments, FaCheckDouble, FaLink } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { useChat } from '../hooks/useChat';
import api from '../api';
import Loader from '../components/ui/Loader';
import GlassButton from '../components/ui/GlassButton';
import { motion } from 'framer-motion';

/**
 * Redesigned Premium Chat / Messenger screen.
 * Integrates real-time Socket.IO chat rooms, receipts, and user indicators.
 */
const ChatPage = () => {
  const { bookingId } = useParams();
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  const { messages, sendMessage, loading: chatLoading, error: chatError } = useChat(bookingId);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [inputText, setInputText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load booking details on mount/update
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setDetailsLoading(true);
        setDetailsError('');

        const endpoint = user.role === 'provider' ? '/bookings/provider' : '/bookings/my';
        const bookingRes = await api.get(endpoint);
        const currentBooking = bookingRes.data.bookings.find(
          (b) => Number(b.id) === Number(bookingId)
        );
        if (currentBooking) {
          setBookingDetails(currentBooking);
        }

        // Mark incoming messages as read initially
        await api.patch(`/chat/booking/${bookingId}/read`);
      } catch (err) {
        setDetailsError(err.response?.data?.message || 'Failed to load booking details');
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, user]);

  // Track socket connection state for status indicator
  useEffect(() => {
    if (!socket) {
      setSocketConnected(false);
      return;
    }

    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Automatically mark incoming messages as read when they arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && Number(lastMsg.sender_id) !== Number(user.id)) {
        api.patch(`/chat/booking/${bookingId}/read`).catch((err) => {
          console.error('Failed to mark incoming messages as read:', err);
        });
      }
    }
  }, [messages, bookingId, user.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleBack = () => {
    if (user.role === 'provider') {
      navigate('/provider/dashboard');
    } else {
      navigate('/user/bookings');
    }
  };

  const loading = chatLoading || detailsLoading;
  const error = chatError || detailsError;

  if (loading && !bookingDetails) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Opening chat messenger..." />
      </div>
    );
  }

  const opposingPartyName =
    user.role === 'provider'
      ? bookingDetails?.customer_name || 'Customer'
      : bookingDetails?.provider_name || 'Provider';

  return (
    <motion.div 
      style={{ maxWidth: '900px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      <div className="chat-container">
        
        {/* Chat header */}
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GlassButton 
              onClick={handleBack} 
              variant="outline" 
              style={{ padding: 8, border: 'none', background: 'transparent' }} 
              title="Back"
            >
              <FaArrowLeft size={16} />
            </GlassButton>
            <div style={{ textAlign: 'left' }}>
              <h2 className="chat-header-title" style={{ margin: 0, color: 'var(--text-main)', background: 'none', WebkitTextFillColor: 'initial' }}>{opposingPartyName}</h2>
              {bookingDetails && (
                <p style={{ fontSize: 11, margin: '2px 0 0 0', color: 'var(--text-muted)' }}>
                  Booking #{bookingId} &bull; {bookingDetails.category_name}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 650 }}>
            <span className={`chat-status-indicator ${socketConnected ? 'online' : 'offline'}`} />
            <span style={{ color: socketConnected ? 'var(--success)' : 'var(--text-muted)' }}>
              {socketConnected ? 'Live Connection' : 'Disconnected'}
            </span>
          </div>
        </header>

        {/* Booking Context Banner */}
        {bookingDetails && (
          <div style={{ padding: '10px 24px', backgroundColor: 'rgba(5, 5, 10, 0.4)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem', textAlign: 'left', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <FaLink style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent)' }} />
            <strong>Requirement Context:</strong> {bookingDetails.service_description}
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ borderRadius: 0, borderInline: 'none' }}>
            {error}
          </div>
        )}

        {/* Messages list */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, color: 'var(--text-light)', textAlign: 'center' }}>
              <FaComments size={36} style={{ marginBottom: 12, opacity: 0.5, color: 'var(--accent)' }} />
              <p style={{ margin: 0, fontSize: 14 }}>No messages exchanged yet. Type below to open conversation.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = Number(msg.sender_id) === Number(user.id);
              return (
                <div key={msg.id || index} className={`chat-message-row ${isMe ? 'sent' : 'received'}`}>
                  <div className="chat-bubble animate-scale">
                    {!isMe && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, display: 'block' }}>
                        {opposingPartyName}
                      </span>
                    )}
                    <p style={{ margin: 0, fontSize: '0.95rem', wordBreak: 'break-word' }}>
                      {msg.message}
                    </p>
                    
                    <div className="chat-message-meta">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          <FaCheckDouble size={10} style={{ color: msg.is_read ? 'var(--accent)' : 'rgba(255, 255, 255, 0.45)' }} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Composer */}
        <form onSubmit={handleSend} className="chat-composer">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write a secure message..."
            className="form-control"
            maxLength={1000}
            disabled={!socketConnected}
            style={{ borderRadius: 'var(--radius-full)' }}
          />
          <GlassButton
            type="submit"
            disabled={!inputText.trim() || !socketConnected}
            variant="primary"
            style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, flexShrink: 0 }}
          >
            <FaPaperPlane size={13} />
          </GlassButton>
        </form>

      </div>
    </motion.div>
  );
};

export default ChatPage;
