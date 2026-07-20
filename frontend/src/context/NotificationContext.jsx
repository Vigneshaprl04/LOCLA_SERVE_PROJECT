import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, socket } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const isFetchedRef = useRef(false);

  // 1. Fetch initial state from database via REST
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [notifsRes, countRes] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count")
      ]);
      setNotifications(notifsRes.data.notifications || []);
      setUnreadCount(countRes.data.unreadCount || 0);
      isFetchedRef.current = true;
    } catch (err) {
      console.error("Failed to load notifications history:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      isFetchedRef.current = false;
    }
  }, [user, fetchNotifications]);

  // 2. Mark single notification as read (Socket.IO emit)
  const markAsRead = useCallback((notificationId) => {
    if (!socket || !notificationId) return;
    socket.emit("notification_mark_read", { notificationId: Number(notificationId) });
  }, [socket]);

  // 3. Mark all notifications as read (Socket.IO emit)
  const markAllAsRead = useCallback(() => {
    if (!socket) return;
    socket.emit("notification_read_all");
  }, [socket]);

  // 4. Register single Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    // Listener for new inbound notifications
    const handleNewNotification = (notification) => {
      console.log("[NotificationContext] New notification received:", notification);
      setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) return prev;
        const mapped = {
          id: notification.id,
          user_id: notification.userId || user?.id,
          booking_id: notification.bookingId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: false,
          created_at: notification.createdAt || new Date()
        };
        return [mapped, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    // Listener for single read confirmations
    const handleNotificationRead = (data) => {
      const readId = Number(data.notificationId);
      console.log("[NotificationContext] Acknowledged read status for notification ID:", readId);
      setNotifications(prev =>
        prev.map(n => (Number(n.id) === readId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // Listener for read all confirmations
    const handleNotificationReadAll = (data) => {
      console.log("[NotificationContext] Acknowledged read all status:", data);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    };

    socket.on("notification", handleNewNotification);
    socket.on("notification_read", handleNotificationRead);
    socket.on("notification_read_all", handleNotificationReadAll);

    const handleConnect = () => {
      console.log("[NotificationContext] Socket connected/reconnected. Joining user notifications room...");
      socket.emit("joinUser");
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("notification", handleNewNotification);
      socket.off("notification_read", handleNotificationRead);
      socket.off("notification_read_all", handleNotificationReadAll);
      socket.off("connect", handleConnect);
    };
  }, [socket, user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        loading,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
export default NotificationProvider;
