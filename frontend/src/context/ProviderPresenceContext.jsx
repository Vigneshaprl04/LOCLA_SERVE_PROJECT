import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const ProviderPresenceContext = createContext(null);

/**
 * Context Provider that maintains a single Socket.IO subscription
 * for real-time provider presence and exposes statuses globally.
 */
export const ProviderPresenceProvider = ({ children }) => {
  const { socket } = useAuth();
  // Map of providerId (Number) -> isOnline (Boolean)
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    if (!socket) {
      setPresenceMap({});
      return;
    }

    const handleStatusChanged = (data) => {
      console.log("[GlobalPresence] Received status change event:", data);
      const providerId = Number(data?.providerId);
      const isOnline = !!data?.isOnline;

      if (!isNaN(providerId)) {
        setPresenceMap((prev) => ({
          ...prev,
          [providerId]: isOnline
        }));
      }
    };

    socket.on("provider_status_changed", handleStatusChanged);

    // Clean up event listener when socket changes or component unmounts
    return () => {
      socket.off("provider_status_changed", handleStatusChanged);
    };
  }, [socket]);

  /**
   * Initializes or manually overrides a provider's online status in the map.
   * @param {number} providerId 
   * @param {boolean} isOnline 
   */
  const updateProviderPresence = (providerId, isOnline) => {
    const id = Number(providerId);
    if (!isNaN(id)) {
      setPresenceMap((prev) => ({
        ...prev,
        [id]: !!isOnline
      }));
    }
  };

  return (
    <ProviderPresenceContext.Provider value={{ presenceMap, updateProviderPresence }}>
      {children}
    </ProviderPresenceContext.Provider>
  );
};

/**
 * Access hook for the shared Provider Presence context.
 */
export const useProviderPresenceContext = () => {
  const context = useContext(ProviderPresenceContext);
  if (!context) {
    throw new Error("useProviderPresenceContext must be used within ProviderPresenceProvider");
  }
  return context;
};
