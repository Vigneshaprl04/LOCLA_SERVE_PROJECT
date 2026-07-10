import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { FaMapMarkerAlt, FaStar, FaTools, FaWrench, FaBolt, FaBroom, FaPaintRoller, FaUserCog, FaBriefcase, FaCompass } from "react-icons/fa";

const CATEGORIES = [
  { id: "", name: "All Services" },
  { id: "1", name: "Electrician" },
  { id: "2", name: "Plumber" },
  { id: "3", name: "Mechanic" },
  { id: "4", name: "Carpenter" },
  { id: "5", name: "Painter" },
  { id: "6", name: "AC Repair" },
  { id: "7", name: "Appliance Repair" },
  { id: "8", name: "Cleaning Service" }
];

const getCategoryIcon = (name) => {
  switch (name) {
    case "Electrician": return <FaBolt />;
    case "Plumber": return <FaWrench />;
    case "Mechanic": return <FaTools />;
    case "Carpenter": return <FaTools />;
    case "Painter": return <FaPaintRoller />;
    case "AC Repair": return <FaBolt />;
    case "Appliance Repair": return <FaTools />;
    case "Cleaning Service": return <FaBroom />;
    default: return <FaCompass />;
  }
};

function UserHome() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(20);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setMessage("Acquiring location details...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocation(coords);
        setMessage("");
        searchNearby(coords);
      },
      () => {
        setLoading(false);
        setMessage("Unable to access location permission.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const searchNearby = async (coords = location) => {
    if (!coords) {
      setMessage("Get your location first");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const params = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius,
      };

      if (categoryId) {
        params.category_id = categoryId;
      }

      const response = await api.get("/providers/nearby", {
        params,
      });

      setProviders(response.data.providers || []);

      if (response.data.providers.length === 0) {
        setMessage("No nearby providers found in this radius.");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to search nearby providers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearby(location);
    }
  }, [categoryId, radius]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}>
      
      {/* Hero section */}
      <div 
        className="card animate-fade-up" 
        style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          color: '#ffffff',
          marginBottom: 30,
          border: 'none',
          textAlign: 'left'
        }}
      >
        <h1 style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.03em' }}>
          Local Services, Instantly Verified.
        </h1>
        <p style={{ color: 'var(--primary-light)', fontSize: '1.05rem', margin: 0, maxWidth: 640 }}>
          Find, chat with, and book certified local service professionals in your neighborhood within minutes.
        </p>
      </div>

      {/* Search Filter Controls Card */}
      <div className="card animate-fade-up" style={{ padding: 20, marginBottom: 30, animationDelay: '100ms' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          
          <div className="form-group" style={{ flex: '1 1 240px' }}>
            <label className="form-label">Search Radius</label>
            <div className="input-icon-group">
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="form-control"
              >
                <option value={5}>Within 5 KM</option>
                <option value={10}>Within 10 KM</option>
                <option value={20}>Within 20 KM</option>
                <option value={50}>Within 50 KM</option>
              </select>
              <span className="input-icon">
                <FaCompass />
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => searchNearby()} className="btn-primary">
              Search Providers
            </button>
            <button onClick={getLocation} className="btn-outline">
              <FaMapMarkerAlt /> Refresh Location
            </button>
          </div>

        </div>

        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 14 }}>
            <FaMapMarkerAlt style={{ color: 'var(--primary)' }} />
            <span>Active Coordinates: <strong>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</strong></span>
          </div>
        )}
      </div>

      {message && (
        <div className="alert alert-danger animate-shake" style={{ marginBottom: 24 }}>
          {message}
        </div>
      )}

      {/* Service Categories Grid */}
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Browse Service Categories
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Select a category to filter local service professionals
        </p>
      </div>

      <div className="category-grid animate-fade-up" style={{ animationDelay: '200ms', marginBottom: 30 }}>
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className={`category-card ${categoryId === cat.id ? 'active' : ''}`}
            onClick={() => setCategoryId(cat.id)}
          >
            <div className="category-icon-container">
              {getCategoryIcon(cat.name)}
            </div>
            <span className="category-label">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* Section Divider */}
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Nearby Providers
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Showing providers based on selected radius and category filters
        </p>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="provider-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card">
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            No nearby service providers matched your search parameters. Try expanding your search radius.
          </p>
        </div>
      ) : (
        /* Providers grid cards */
        <section className="provider-grid">
          {providers.map((provider, index) => (
            <article
              className="provider-card card-lift animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
              key={provider.provider_id}
            >
              <div>
                <div className="provider-card-header">
                  <span className="badge badge-accent">
                    {provider.category_name}
                  </span>
                  <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaMapMarkerAlt size={10} /> {Number(provider.distance_km).toFixed(1)} KM
                  </span>
                </div>

                <h3 className="provider-name">
                  {provider.name}
                  {provider.verification_status === 'verified' && (
                    <span style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600 }}>✓ Verified</span>
                  )}
                </h3>

                <div className="provider-details-row">
                  <div className="provider-meta-item">
                    <FaStar color="#f59e0b" />
                    <strong>{Number(provider.average_rating || 0).toFixed(1)}</strong>
                  </div>
                  <div className="provider-meta-item">
                    <FaBriefcase />
                    <span>{provider.experience} Yrs Exp</span>
                  </div>
                </div>

                <p className="provider-description">
                  {provider.description || 'No description provided. Connect with them to learn details.'}
                </p>
              </div>

              <button
                onClick={() => navigate(`/providers/${provider.provider_id}`)}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                View Profile & Book
              </button>
            </article>
          ))}
        </section>
      )}

    </div>
  );
}

export default UserHome;
