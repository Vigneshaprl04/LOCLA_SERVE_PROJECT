import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaTrash } from "react-icons/fa";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../AuthContext";
import api from "../api";

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setIsOpen(false);

    // Route dynamically based on user role and booking_id
    if (notif.booking_id) {
      if (user?.role === "provider") {
        navigate("/provider/dashboard");
      } else {
        navigate("/user/bookings");
      }
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      // Triggers visual refresh of list by reloading window or context
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={handleToggle} className="bell-button" style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: "8px", color: "var(--text-main)", outline: "none", display: "flex", alignItems: "center" }} title="Notifications">
        <FaBell size={19} />
        {unreadCount > 0 && (
          <span className="bell-badge" style={{ position: "absolute", top: "2px", right: "2px", backgroundColor: "var(--danger, #dc3545)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", minWidth: "12px", textAlign: "center", lineHeight: 1 }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown animate-fade-up" style={{ position: "absolute", right: 0, top: "45px", width: "320px", maxHeight: "400px", backgroundColor: "var(--bg-card, #fff)", border: "1px solid var(--border-color, #eaeaea)", borderRadius: "var(--radius-lg, 12px)", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          <header style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color, #eaeaea)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-app)" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn-text" style={{ fontSize: "11px", color: "var(--primary)", border: "none", background: "none", cursor: "pointer", fontWeight: "600", padding: 0 }}>
                Mark all as read
              </button>
            )}
          </header>

          <div style={{ flex: 1, overflowY: "auto", maxHeight: "300px" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color, #eaeaea)",
                    cursor: "pointer",
                    backgroundColor: notif.is_read ? "transparent" : "var(--bg-app)",
                    transition: "background 0.2s ease",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read ? "transparent" : "var(--bg-app)";
                  }}
                >
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {!notif.is_read && (
                        <span style={{ width: "6px", height: "6px", backgroundColor: "var(--primary, #007bff)", borderRadius: "50%", display: "inline-block" }} />
                      )}
                      <h4 style={{ margin: 0, fontSize: "13px", fontWeight: notif.is_read ? "600" : "800", color: "var(--text-main)" }}>
                        {notif.title}
                      </h4>
                    </div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginTop: "6px" }}>
                      {new Date(notif.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => handleDelete(e, notif.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                      opacity: 0.5,
                      alignSelf: "center",
                      transition: "opacity 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.5}
                    title="Delete"
                  >
                    <FaTrash size={10} />
                  </button>
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
