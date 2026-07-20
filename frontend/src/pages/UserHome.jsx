import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";
import Loader from "../components/ui/Loader";
import { FaMapMarkerAlt, FaStar, FaTools, FaWrench, FaBolt, FaBroom, FaPaintRoller, FaBriefcase, FaCompass, FaRobot } from "react-icons/fa";
import { useProviderPresence } from "../hooks/useProviderPresence";
import { motion } from "framer-motion";
import "../styles/UserHome.css";

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

  const [categories, setCategories] = useState([{ id: "", name: "All Services" }]);
  const [providers, setProviders] = useState([]);
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(20);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const searchNearby = useCallback(async (coords) => {
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
  }, [radius, categoryId]);

  const getLocation = useCallback(() => {
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
  }, []);

  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about home services and repairs.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/providers/categories');
        if (res.data.categories) {
          setCategories([
            { id: "", name: "All Services" },
            ...res.data.categories
          ]);
        }
      } catch (err) {
        console.error('Failed to load categories in UserHome:', err);
        // Safe fallback matching existing DB schema
        setCategories([
          { id: "", name: "All Services" },
          { id: "1", name: "Electrician" },
          { id: "2", name: "Plumber" },
          { id: "3", name: "Mechanic" },
          { id: "4", name: "Carpenter" },
          { id: "5", name: "Painter" },
          { id: "6", name: "AC Repair" },
          { id: "7", name: "Appliance Repair" },
          { id: "8", name: "Cleaning Service" }
        ]);
      }
    };

    const fetchRecommendations = async () => {
      try {
        const res = await api.get('/ai/recommendations');
        if (res.data.success) {
          setAiRecommendations(res.data.recommendations || []);
        }
      } catch (err) {
        console.log('Skipped loading AI recommendations:', err.message);
      }
    };

    fetchCats();
    fetchRecommendations();
    getLocation();
  }, []);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setChatLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMsg,
          conversationContext: chatMessages.slice(-4).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          }))
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.text) {
                accumulatedText += parsed.text;
                setChatMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { role: 'assistant', content: accumulatedText };
                  return next;
                });
              }
            } catch (err) {}
          }
        }
      }
    } catch (err) {
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Connection timed out. Please try rephrasing.' };
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      searchNearby(location);
    }
  }, [location, searchNearby]);

  return (
    <motion.div 
      style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      {/* Hero section */}
      <motion.div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid var(--glass-border)',
          marginBottom: 30,
          textAlign: 'left',
          padding: '40px 32px'
        }}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.03em', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Local Services, Instantly Verified.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '0 0 24px 0', maxWidth: 640 }}>
          Find, chat with, and book certified local service professionals in your neighborhood within minutes.
        </p>
        <GlassButton 
          onClick={() => navigate('/user/assistant')} 
          variant="primary" 
          glow={true}
        >
          <FaRobot style={{ fontSize: 16 }} /> Try AI Service Assistant
        </GlassButton>
      </motion.div>

      {/* Search Filter Controls Card */}
      <GlassCard hoverLift={false} style={{ padding: 24, marginBottom: 30 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          
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
            <GlassButton onClick={() => searchNearby(location)} variant="primary">
              Search Providers
            </GlassButton>
            <GlassButton onClick={getLocation} variant="secondary">
              <FaMapMarkerAlt /> Refresh Location
            </GlassButton>
          </div>

        </div>

        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 16 }}>
            <FaMapMarkerAlt style={{ color: 'var(--accent)' }} />
            <span>Active Coordinates: <strong>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</strong></span>
          </div>
        )}
      </GlassCard>

      {message && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          {message}
        </div>
      )}

      {/* Service Categories Grid */}
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
          Browse Service Categories
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
          Select a category to filter local service professionals
        </p>
      </div>

      <motion.div 
        className="category-grid" 
        style={{ marginBottom: 40 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {categories.map((cat) => {
          const isRecommended = aiRecommendations.includes(cat.name);
          return (
            <motion.div
              key={cat.id}
              className={`category-card ${categoryId === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryId(cat.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              style={{ position: 'relative' }}
            >
              {isRecommended && (
                <span style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  color: '#a78bfa', 
                  background: 'rgba(124, 58, 237, 0.15)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  border: '1px solid rgba(124, 58, 237, 0.3)', 
                  boxShadow: '0 0 8px rgba(124, 58, 237, 0.2)' 
                }}>
                  ★ Rec
                </span>
              )}
              <div className="category-icon-container">
                {getCategoryIcon(cat.name)}
              </div>
              <span className="category-label">{cat.name}</span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Section Divider */}
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
          Nearby Providers
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
          Showing providers based on selected radius and category filters
        </p>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ padding: '60px 0' }}>
          <Loader size={50} text="Locating nearby service professionals..." />
        </div>
      ) : providers.length === 0 ? (
        <GlassCard hoverLift={false} style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            No nearby service providers matched your search parameters. Try expanding your search radius.
          </p>
        </GlassCard>
      ) : (
        /* Providers grid cards */
        <motion.section 
          className="provider-grid"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {providers.map((provider) => (
            <ProviderCard
              key={provider.provider_id}
              provider={provider}
              navigate={navigate}
            />
          ))}
        </motion.section>
      )}

      {/* Floating AI Chat Assistant Widget Bubble */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(124, 58, 237, 0.4)',
            transition: 'transform var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Ask AI Assistant"
          aria-label="Toggle AI Assistant"
        >
          <FaRobot size={22} />
        </button>
      </div>

      {/* Floating AI Assistant Chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            style={{
              position: 'fixed',
              bottom: '96px',
              right: '30px',
              width: '360px',
              height: '480px',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <GlassCard hoverLift={false} style={{ width: '100%', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaRobot style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>LocalServe AI Advisor</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
                </div>

                {/* Messages scroll content */}
                <div style={{ height: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }} className="custom-scrollbar">
                  {chatMessages.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        lineHeight: 1.45,
                        background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                        color: m.role === 'user' ? '#ffffff' : 'var(--text-main)',
                        border: m.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                        textAlign: 'left'
                      }}>
                        {m.content === '' && chatLoading ? <Loader size={16} text="" /> : m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input form footer */}
              <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: '12px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about wiring leaks, repairs..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem'
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

function ProviderCard({ provider, navigate }) {
  const isOnline = useProviderPresence(provider.provider_id, provider.availability_status);

  return (
    <motion.div
      variants={{
        hidden: { y: 15, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { duration: 0.3 } }
      }}
    >
      <GlassCard className="provider-card" glow={isOnline}>
        <div>
          <div className="provider-card-header" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-accent">
              {provider.category_name}
            </span>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaMapMarkerAlt size={10} /> {Number(provider.distance_km).toFixed(1)} KM
            </span>
            <span className={isOnline ? 'badge-success badge' : 'badge-danger badge'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: isOnline ? 'var(--success)' : 'var(--error)',
                boxShadow: isOnline ? '0 0 8px var(--success)' : 'none'
              }} />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <h3 className="provider-name">
            <span>{provider.name}</span>
            {provider.verification_status === 'verified' && (
              <span style={{ 
                color: 'var(--accent)', 
                fontSize: '0.8rem', 
                fontWeight: 700, 
                border: '1px solid rgba(6, 182, 212, 0.3)', 
                padding: '2px 8px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                Verified
              </span>
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

        <GlassButton
          onClick={() => navigate(`/providers/${provider.provider_id}`)}
          variant="primary"
          style={{ width: '100%', marginTop: 12 }}
        >
          View Profile & Book
        </GlassButton>
      </GlassCard>
    </motion.div>
  );
}

export default UserHome;
