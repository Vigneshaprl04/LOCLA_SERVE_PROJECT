import api from './api';

// Helper utility to convert VAPID base64 key parameter to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers PWA service worker and handles VAPID subscription credential updates.
 */
export async function registerServiceWorkerAndPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log("[PWA] Service worker or push managers are unsupported on this browser.");
    return;
  }

  try {
    // 1. Lazy Service Worker registration
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log("[PWA] Service Worker registered with scope:", registration.scope);

    // 2. Request Notification permissions
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      console.log("[PWA] Push notification permissions denied by user.");
      return;
    }

    // 3. Check VAPID public key
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.warn("[PWA] VITE_VAPID_PUBLIC_KEY missing from env. Skipping Push subscription.");
      return;
    }

    // 4. Retrieve or create push subscriptions
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicVapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
      console.log("[PWA] New Push subscription credentials created successfully.");
    }

    // 5. Send registration payload to backend endpoint if user session exists
    const token = localStorage.getItem('token');
    if (token) {
      await api.post('/notifications/subscribe', { subscription });
      console.log("[PWA] Registered subscription on the server database.");
    }
  } catch (error) {
    console.error("[PWA] Setup failure:", error.message);
  }
}
