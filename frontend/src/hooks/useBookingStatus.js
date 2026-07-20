import { useContext, useEffect } from "react";
import { BookingContext } from "../context/BookingContext";

/**
 * Custom hook to subscribe to and read the status of a specific booking.
 * Reads status from BookingContext and automatically requests socket room join on mount.
 * 
 * @param {number|string} bookingId - The ID of the booking to track
 * @returns {object} { status, updatedAt, loading }
 */
export const useBookingStatus = (bookingId) => {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error("useBookingStatus must be used within a BookingProvider");
  }

  const { statuses, joinBooking } = context;

  useEffect(() => {
    if (bookingId) {
      joinBooking(bookingId);
    }
  }, [bookingId, joinBooking]);

  const bookingData = statuses.get(Number(bookingId));

  if (!bookingData) {
    return {
      status: null,
      updatedAt: null,
      loading: true
    };
  }

  return {
    status: bookingData.status,
    updatedAt: bookingData.updatedAt,
    loading: false
  };
};
