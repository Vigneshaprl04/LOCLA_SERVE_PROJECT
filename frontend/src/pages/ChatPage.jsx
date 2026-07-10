import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaComments, FaCheckDouble, FaLink } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import api from '../api';

const ChatPage = () => {
  const { bookingId } = useParams();
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markAsRead = async () => {
    try {
      await api.patch(`/chat/booking/${bookingId}/read`);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const messagesRes = await api.get(`/messages/${bookingId}`);
        setMessages(messagesRes.data.messages || []);

        const endpoint = user.role === 'provider' ? '/bookings/provider' : '/bookings/my';
        const bookingRes = await api.get(endpoint);
        const currentBooking = bookingRes.data.bookings.find(
          (b) => Number(b.id) === Number(bookingId)
        );
        if (currentBooking) {
          setBookingDetails(currentBooking);
        }

        await markAsRead();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load chat history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, user]);

  useEffect(() => {
    if (!socket) {
      setSocketConnected(false);
      return;
    }

    setSocketConnected(socket.connected);

    if (socket.connected) {
      socket.emit('joinBooking', { bookingId: Number(bookingId) });
    }

    const onConnect = () => {
      setSocketConnected(true);
      socket.emit('joinBooking', { bookingId: Number(bookingId) });
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onNewMessage = (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (Number(message.sender_id) !== Number(user.id)) {
        markAsRead();
      }
    };

    const onChatError = (err) => {
      setError(err.message || 'Socket error occurred');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newMessage', onNewMessage);
    socket.on('chat_error', onChatError);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newMessage', onNewMessage);
      socket.off('chat_error', onChatError);
    };
  }, [bookingId, user, socket]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('sendMessage', {
      bookingId: Number(bookingId),
      message: inputText.trim()
    });

    setInputText('');
  };

  const handleBack = () => {
    if (user.role === 'provider') {
      navigate('/provider/dashboard');
    } else {
      navigate('/user/bookings');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-muted)' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
        <p>Loading chat history...</p>
      </div>
    );
  }

  const opposingPartyName =
    user.role === 'provider'
      ? bookingDetails?.customer_name || 'Customer'
      : bookingDetails?.provider_name || 'Provider';

  return (
    <div style={{ maxWidth: '900px', margin: '24px auto', padding: '0 24px', boxSizing: 'border-box' }}>
      
      <div className="chat-container animate-fade-up">
        
        {/* Chat header */}
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleBack} className="btn-outline" style={{ padding: 8, border: 'none', background: 'transparent', outline: 'none' }} title="Back">
              <FaArrowLeft size={16} />
            </button>
            <div style={{ textAlign: 'left' }}>
              <h2 className="chat-header-title" style={{ margin: 0 }}>{opposingPartyName}</h2>
              {bookingDetails && (
                <p style={{ fontSize: 11, margin: '2px 0 0 0', color: 'var(--text-muted)' }}>
                  Booking #{bookingId} &bull; {bookingDetails.category_name}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span className={`chat-status-indicator ${socketConnected ? 'online' : 'offline'}`} />
            <span style={{ color: socketConnected ? 'var(--success)' : 'var(--text-muted)' }}>
              {socketConnected ? 'Live Connection' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Booking Context Banner */}
        {bookingDetails && (
          <div style={{ padding: '8px 24px', backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', fontSize: '0.775rem', textAlign: 'left', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <FaLink style={{ marginRight: 6, verticalAlign: 'middle' }} />
            <strong>Context Description:</strong> {bookingDetails.service_description}
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>
              <FaComments size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No messages exchanged yet. Type below to open conversation.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = Number(msg.sender_id) === Number(user.id);
              return (
                <div key={msg.id || index} className={`chat-message-row ${isMe ? 'sent' : 'received'}`}>
                  <div className="chat-bubble animate-scale">
                    {!isMe && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 2, display: 'block' }}>
                        {opposingPartyName}
                      </span>
                    )}
                    <p style={{ margin: 0, fontSize: '0.925rem', wordBreak: 'break-word' }}>
                      {msg.message}
                    </p>
                    
                    <div className="chat-message-meta">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          <FaCheckDouble size={10} style={{ color: msg.is_read ? 'var(--accent)' : 'rgba(255, 255, 255, 0.4)' }} />
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
            placeholder="Write a message..."
            className="form-control"
            maxLength={1000}
            disabled={!socketConnected}
            style={{ borderRadius: 'var(--radius-full)' }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !socketConnected}
            className="btn-primary"
            style={{ width: 42, height: 42, borderRadius: '50%', padding: 0, flexShrink: 0 }}
          >
            <FaPaperPlane size={13} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default ChatPage;
