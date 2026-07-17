import { useEffect } from "react";
import { useProviderPresenceContext } from "../context/ProviderPresenceContext";

/**
 * Custom React Hook to retrieve real-time online availability status for a provider.
 * Reads from a shared global context map to avoid registering duplicate socket event listeners.
 * 
 * @param {number} providerId - The provider's ID to monitor
 * @param {boolean} [initialStatus] - Fallback status if the provider isn't yet tracked globally
 * @returns {boolean} Whether the provider is currently online
 */
export const useProviderPresence = (providerId, initialStatus) => {
  const { presenceMap, updateProviderPresence } = useProviderPresenceContext();
  const id = Number(providerId);

  // Initialize the tracking state in the global map if it is currently undefined
  useEffect(() => {
    if (!isNaN(id) && id > 0 && presenceMap[id] === undefined && initialStatus !== undefined) {
      updateProviderPresence(id, initialStatus);
    }
  }, [id, presenceMap, initialStatus, updateProviderPresence]);

  // Return live status if tracked, else fall back to initialStatus or false
  return presenceMap[id] !== undefined ? presenceMap[id] : !!initialStatus;
};
