import { io } from "socket.io-client";

const socketUrl = import.meta.env?.VITE_SOCKET_URL || "http://localhost:5000";

let socketInstance = null;

/**
 * Retrieves the singleton Socket.IO client instance.
 * Automatically handles connection and authentication.
 * @param {string} token - The active JWT authorization token
 * @returns {object|null} The Socket.IO socket instance, or null if no token is provided
 */
export const getSocket = (token) => {
  if (!token) {
    if (socketInstance) {
      console.log("[SocketClient] Disconnecting and removing socket due to empty token.");
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    console.log("[SocketClient] Created new socket instance.");
  } else {
    // If the token changes, update auth configuration and reconnect
    if (socketInstance.auth?.token !== token) {
      console.log("[SocketClient] Token changed. Reconnecting socket with new token.");
      socketInstance.auth = { token };
      socketInstance.disconnect().connect();
    }
  }

  return socketInstance;
};

/**
 * Disconnects and destroys the active socket instance.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    console.log("[SocketClient] Disconnecting and destroying socket instance.");
    socketInstance.disconnect();
    socketInstance = null;
  }
};
