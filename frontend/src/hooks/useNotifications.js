import { useContext } from "react";
import { NotificationContext } from "../context/NotificationContext";

/**
 * Custom hook to consume the notification context values.
 * 
 * @returns {object} { notifications, unreadCount, markAsRead, markAllAsRead, loading }
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }

  return {
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    loading: context.loading
  };
};
export default useNotifications;
