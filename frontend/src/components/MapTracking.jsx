import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import Loader from './ui/Loader';
import GlassCard from './ui/GlassCard';
import { FaLocationArrow, FaPlus, FaMinus, FaCompass, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Premium, native Google Maps tracking component.
 * Avoids React 19 package peer-dependency issues by loading script directly.
 * Handles permissions, customer & provider markers, recentring, zoom, and live socket streams.
 */
const MapTracking = ({
  bookingId,
  bookingStatus = '',
  onLocationDetected = null
}) => {
  const { socket } = useAuth();
  
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [customerMarker, setCustomerMarker] = useState(null);
  
  // Track provider marker and coords in state
  const [providerMarker, setProviderMarker] = useState(null);
  const [liveProviderCoords, setLiveProviderCoords] = useState(null);

  // States
  const [customerLocation, setCustomerLocation] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt'); // prompt, granted, denied, unsupported, error
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // API Key check
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Centering helper
  const handleRecenter = useCallback(() => {
    if (mapInstance && customerLocation) {
      if (liveProviderCoords) {
        // Fit both markers in bounds
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(customerLocation);
        bounds.extend(liveProviderCoords);
        mapInstance.fitBounds(bounds);
      } else {
        // Just center on customer
        mapInstance.panTo(customerLocation);
        mapInstance.setZoom(15);
      }
    }
  }, [mapInstance, customerLocation, liveProviderCoords]);

  // Zoom helpers
  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1);
    }
  };

  // Geolocation detection helper (Customer)
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      setErrorMessage('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCustomerLocation(coords);
        setPermissionState('granted');
        setErrorMessage('');
        setLoading(false);
        if (onLocationDetected) {
          onLocationDetected(coords);
        }
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setErrorMessage('Location access was denied. Please enable permission to track bookings.');
        } else {
          setPermissionState('error');
          setErrorMessage('Unable to retrieve your current location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationDetected]);

  // 1. Detect location on mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // 2. Listen to provider location updates via Socket.IO
  useEffect(() => {
    if (!socket || !bookingId) return;

    // Start tracking sub
    socket.emit("customer:tracking:start", { bookingId });
    console.log(`[Socket] Sent customer:tracking:start for booking ${bookingId}`);

    const handleTrackingUpdate = (data) => {
      if (Number(data.bookingId) === Number(bookingId)) {
        console.log(`[Socket] Received tracking update for booking ${bookingId}: lat=${data.latitude}, lng=${data.longitude}`);
        setLiveProviderCoords({
          lat: Number(data.latitude),
          lng: Number(data.longitude)
        });
      }
    };

    socket.on("booking:tracking:update", handleTrackingUpdate);

    return () => {
      socket.emit("customer:tracking:stop", { bookingId });
      socket.off("booking:tracking:update", handleTrackingUpdate);
      console.log(`[Socket] Cleaned up tracking for booking ${bookingId}`);
    };
  }, [socket, bookingId]);

  // 3. Load Google Maps Script
  useEffect(() => {
    if (permissionState !== 'granted' || !customerLocation) return;

    let isMounted = true;
    const scriptId = 'google-maps-script-tag';

    const initializeMap = () => {
      if (!mapRef.current || !window.google || !isMounted) return;

      const mapOptions = {
        center: customerLocation,
        zoom: 15,
        disableDefaultUI: true, // Use custom controls for premium UX
        styles: [
          // Sleek dark theme map styles (Apple Vision inspired)
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
          { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] }
        ]
      };

      const map = new window.google.maps.Map(mapRef.current, mapOptions);
      setMapInstance(map);

      // Create custom customer marker (blue neon dot)
      const customerMarkerInstance = new window.google.maps.Marker({
        position: customerLocation,
        map: map,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      setCustomerMarker(customerMarkerInstance);
    };

    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener('load', initializeMap);
    }

    return () => {
      isMounted = false;
    };
  }, [permissionState, customerLocation, apiKey]);

  // 4. Update or render Provider Marker
  useEffect(() => {
    if (!mapInstance || !liveProviderCoords || !window.google) return;

    if (providerMarker) {
      // Move existing marker smoothly
      providerMarker.setPosition(liveProviderCoords);
    } else {
      // Create new provider marker (red neon arrow)
      const marker = new window.google.maps.Marker({
        position: liveProviderCoords,
        map: mapInstance,
        title: 'Service Partner',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      setProviderMarker(marker);

      // Auto-fit bounds on first load
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(customerLocation);
      bounds.extend(liveProviderCoords);
      mapInstance.fitBounds(bounds);
    }
  }, [mapInstance, liveProviderCoords, customerLocation, providerMarker]);

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      if (customerMarker) customerMarker.setMap(null);
      if (providerMarker) providerMarker.setMap(null);
    };
  }, [customerMarker, providerMarker]);

  // 5. Render Map canvas or fallbacks
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '300px', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
        <Loader text="Searching customer coordinates..." />
      </div>
    );
  }

  if (permissionState === 'denied' || permissionState === 'unsupported' || permissionState === 'error') {
    return (
      <GlassCard hoverLift={false} style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <FaExclamationTriangle size={36} style={{ color: 'var(--warning)' }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Location Services Unavailable</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '380px', lineHeight: 1.5 }}>
          {errorMessage}
        </p>
        <button
          onClick={detectLocation}
          className="btn-outline"
          style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-main)', borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
        >
          Retry Permission Detect
        </button>
      </GlassCard>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
      {/* Map Element */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Map Control overlay (Recenter & Zooms) */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleRecenter}
          style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(10, 15, 30, 0.85)', border: '1px solid var(--glass-border)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          title="Recenter Map Bounds"
          aria-label="Recenter Map"
        >
          <FaLocationArrow size={12} />
        </button>
        <button
          onClick={handleZoomIn}
          style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(10, 15, 30, 0.85)', border: '1px solid var(--glass-border)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <FaPlus size={12} />
        </button>
        <button
          onClick={handleZoomOut}
          style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(10, 15, 30, 0.85)', border: '1px solid var(--glass-border)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <FaMinus size={12} />
        </button>
      </div>

      {/* Compass indicator bottom right */}
      <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(10,15,30,0.85)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <FaCompass size={14} style={{ transform: 'rotate(0deg)' }} />
        </div>
      </div>

      {/* Live status bar details overlay */}
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10, background: 'rgba(10, 15, 30, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: liveProviderCoords ? 'var(--success)' : 'var(--warning)', display: 'inline-block', boxShadow: liveProviderCoords ? '0 0 8px var(--success-glow)' : 'none' }}></span>
        <span style={{ color: '#ffffff', fontSize: '0.78rem', fontWeight: 600 }}>
          {liveProviderCoords ? 'Partner Live Tracking Active' : 'Waiting for partner location...'}
        </span>
      </div>
    </div>
  );
};

export default MapTracking;
