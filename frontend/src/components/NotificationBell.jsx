import { useEffect, useState, useRef } from 'react';
import { FaBell, FaCheck, FaTrash, FaInbox } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import api from '../api';

const NotificationBell = () => {
  const { socket, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchUnreadCount();
  }, [user]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (notification) => {
      setNotifications((prev) => {
        // Prevent duplicate entries
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev]; // Newest first
      });
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new_notification', onNewNotification);

    return () => {
      socket.off('new_notification', onNewNotification);
    };
  }, [socket]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  return (
    <div className="notification-bell-container" ref={panelRef}>
      {/* Bell Icon Trigger */}
      <button onClick={togglePanel} className="notification-bell-btn" title="Notifications">
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge pulse animate-scale">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown animate-scale">
          <header className="notification-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none' }}>
                <FaCheck style={{ marginRight: 4 }} /> Mark all read
              </button>
            )}
          </header>

          {error && <div className="alert alert-danger" style={{ borderRadius: 0, padding: '8px 12px', fontSize: 12 }}>{error}</div>}

          <div className="notification-dropdown-list">
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="animate-spin" style={{ display: 'inline-block', marginBottom: 8 }}>🌀</span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FaInbox size={22} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>All caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-dropdown-item ${notif.is_read ? '' : 'unread'}`}
                  style={{
                    borderLeft: notif.is_read ? '3px solid transparent' : '3px solid var(--primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 className="notification-item-title" style={{ fontSize: '0.85rem', margin: '0 0 3px 0', fontWeight: 700 }}>
                      {notif.title}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {new Date(notif.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {!notif.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="btn-outline"
                        style={{ padding: 4, borderRadius: '50%' }}
                        title="Mark read"
                      >
                        <FaCheck size={8} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="btn-outline"
                      style={{ padding: 4, borderRadius: '50%', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      title="Delete"
                    >
                      <FaTrash size={8} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
