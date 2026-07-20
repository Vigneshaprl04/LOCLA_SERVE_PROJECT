import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";

export const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const { socket } = useAuth();
  const [bookingStatuses, setBookingStatuses] = useState(new Map());
  const trackedBookingsRef = useRef(new Set());

  // Function to request tracking / joining a booking room
  const joinBooking = useCallback((bookingId) => {
    if (!bookingId || !socket) return;
    const bId = Number(bookingId);
    if (!trackedBookingsRef.current.has(bId)) {
      trackedBookingsRef.current.add(bId);
      socket.emit("booking_join", { bookingId: bId });
      console.log(`[BookingContext] Emitted booking_join for booking ${bId}`);
    }
  }, [socket]);

  // Function to manually update or pre-populate booking status in map from REST API
  const updateBookingLocalStatus = useCallback((bookingId, statusData) => {
    if (!bookingId) return;
    const bId = Number(bookingId);
    setBookingStatuses(prev => {
      const current = prev.get(bId);
      if (current && current.status === statusData.status && current.updatedAt === statusData.updatedAt) {
        return prev;
      }
      const next = new Map(prev);
      next.set(bId, {
        status: statusData.status,
        updatedAt: statusData.updatedAt || new Date().toISOString()
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      trackedBookingsRef.current.clear();
      setBookingStatuses(new Map());
      return;
    }

    const handleStatusChanged = (data) => {
      console.log("[BookingContext] booking_status_changed received:", data);
      const { bookingId, status, updatedAt } = data;
      setBookingStatuses(prev => {
        const next = new Map(prev);
        next.set(Number(bookingId), { status, updatedAt });
        return next;
      });
    };

    socket.on("booking_status_changed", handleStatusChanged);

    const handleReconnect = () => {
      console.log("[BookingContext] Socket reconnected. Re-joining all rooms:", trackedBookingsRef.current);
      trackedBookingsRef.current.forEach((bookingId) => {
        socket.emit("booking_join", { bookingId });
      });
    };

    socket.on("connect", handleReconnect);

    // If socket is already connected when effect runs, join all currently tracked rooms
    if (socket.connected) {
      handleReconnect();
    }

    return () => {
      socket.off("booking_status_changed", handleStatusChanged);
      socket.off("connect", handleReconnect);
    };
  }, [socket]);

  return (
    <BookingContext.Provider value={{ statuses: bookingStatuses, joinBooking, updateBookingLocalStatus }}>
      {children}
    </BookingContext.Provider>
  );
};
