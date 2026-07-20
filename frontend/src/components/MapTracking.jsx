import { useEffect, useRef, useState, useCallback } from 'react';
import Loader from './ui/Loader';
import GlassCard from './ui/GlassCard';
import { FaLocationArrow, FaPlus, FaMinus, FaCompass, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Premium, native Google Maps tracking component.
 * Avoids React 19 package peer-dependency issues by loading script directly.
 * Handles permissions, centring, zoom, and contains placeholders for provider updates.
 */
const MapTracking = ({
  bookingId,
  providerCoords = null,
  bookingStatus = '',
  onLocationDetected = null
}) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [customerMarker, setCustomerMarker] = useState(null);
  const [providerMarker, setProviderMarker] = useState(null);

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
      mapInstance.panTo(customerLocation);
      mapInstance.setZoom(15);
    }
  }, [mapInstance, customerLocation]);

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

  // 1. Geolocation detection helper
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

  // 2. Load Google Maps Script
  useEffect(() => {
    // Detect location on mount
    detectLocation();
  }, [detectLocation]);

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
      // Check if tag already exists in index.html
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

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      if (customerMarker) customerMarker.setMap(null);
      if (providerMarker) providerMarker.setMap(null);
    };
  }, [customerMarker, providerMarker]);

  // 3. Render maps or fallback blocks
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
          title="Recenter on Me"
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

      {/* Compass Compass indicator bottom right */}
      <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(10,15,30,0.85)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <FaCompass size={14} style={{ transform: 'rotate(0deg)' }} />
        </div>
      </div>
    </div>
  );
};

export default MapTracking;
