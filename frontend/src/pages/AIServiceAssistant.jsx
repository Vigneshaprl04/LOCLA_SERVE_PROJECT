import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";
import Loader from "../components/ui/Loader";
import { 
  FaArrowLeft, 
  FaRobot, 
  FaMapMarkerAlt, 
  FaStar, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaSync, 
  FaBriefcase,
  FaChevronRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Redesigned Premium AIServiceAssistant screen.
 * Futuristic layout with interactive conversation models and real-time provider suggestions.
 */
function AIServiceAssistant() {
  const navigate = useNavigate();

  // Input states
  const [problem, setProblem] = useState("");
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locMessage, setLocMessage] = useState("");

  // Loading and Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Conversational state
  const [conversation, setConversation] = useState([]); // [{ role: 'user'|'assistant', content: '...' }]
  const [lastAnalysis, setLastAnalysis] = useState(null); // stores latest analysis response
  const [matchedProviders, setMatchedProviders] = useState([]); // stores ranked list of providers

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocMessage("Acquiring location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);
        setLocating(false);
        setLocMessage("Location updated successfully!");
        setTimeout(() => setLocMessage(""), 3000);
      },
      (err) => {
        setLocating(false);
        setLocMessage("Unable to access location permission.");
        console.error(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // Submit the analysis request to the backend
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!problem.trim()) return;

    setError("");
    setLoading(true);

    const formattedContext = conversation.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      content: item.content
    }));

    try {
      const response = await api.post("/ai/analyze-service", {
        problem: problem.trim(),
        latitude: location ? location.latitude : null,
        longitude: location ? location.longitude : null,
        conversationContext: formattedContext
      });

      const { success, analysis, providers, message } = response.data;

      if (!success) {
        throw new Error(message || "Analysis failed");
      }

      // Update local conversation log
      const nextConversation = [
        ...conversation,
        { role: "user", content: problem.trim() }
      ];

      setLastAnalysis(analysis);
      setMatchedProviders(providers || []);

      if (analysis.status === "needs_clarification") {
        nextConversation.push({
          role: "assistant",
          content: analysis.clarificationQuestion
        });
      } else if (analysis.status === "matched") {
        nextConversation.push({
          role: "assistant",
          content: `Perfect. I matched your request to "${analysis.serviceCategory}" (${analysis.urgency} priority).`
        });
      } else {
        nextConversation.push({
          role: "assistant",
          content: "I couldn't match your problem to any specific service category. Could you please describe it in another way?"
        });
      }

      setConversation(nextConversation);
      setProblem(""); // Clear input after sending
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        setError("AI service is busy right now. Please try again shortly.");
      } else if (status === 503) {
        setError("AI service is temporarily unavailable. Please try again later.");
      } else {
        setError("Something went wrong while connecting with the AI.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear/Reset the conversation
  const handleReset = () => {
    setConversation([]);
    setLastAnalysis(null);
    setMatchedProviders([]);
    setProblem("");
    setError("");
  };

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case "Emergency": return "badge-danger";
      case "High": return "badge-warning";
      case "Medium": return "badge-accent";
      default: return "badge-secondary";
    }
  };

  return (
    <motion.div 
      style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px", boxSizing: "border-box", width: "100%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      
      {/* Top navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <GlassButton onClick={() => navigate("/user/home")} variant="outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FaArrowLeft /> Back to Home
        </GlassButton>
        <GlassButton onClick={handleReset} variant="outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FaSync /> Start New Analysis
        </GlassButton>
      </div>

      {/* Hero Header */}
      <GlassCard 
        hoverLift={false} 
        style={{ 
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)",
          marginBottom: 30,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          textAlign: "left",
          padding: 32
        }}
      >
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 8, letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 12, color: 'var(--text-main)', background: 'none', WebkitTextFillColor: 'initial' }}>
          <FaRobot style={{ color: 'var(--accent)' }} /> AI Local Service Assistant
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0, maxWidth: 700, lineHeight: 1.55 }}>
          Describe your problem in plain words, and our AI will automatically identify the category, offer safety guidance, and match you with the best available local providers.
        </p>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }} className="responsive-grid">
        
        {/* Left Column: Chat Conversation */}
        <GlassCard hoverLift={false} style={{ display: "flex", flexDirection: "column", minHeight: "480px", justifyContent: "space-between", padding: 28 }}>
          
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 20px 0", borderBottom: "1px solid var(--glass-border)", paddingBottom: 12, background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
              AI Conversation Log
            </h3>
            
            {conversation.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                <FaRobot size={40} style={{ opacity: 0.5, marginBottom: 16, color: 'var(--accent)' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>Type your issue below to get started. You can type in simple words like: <em>"My kitchen sink is leaking water everywhere"</em> or <em>"Power cut only in my room"</em>.</p>
              </div>
            ) : (
              <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 5 }}>
                {conversation.map((msg, index) => (
                  <motion.div 
                    key={index}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      background: msg.role === "user" ? "var(--accent)" : "rgba(255, 255, 255, 0.03)",
                      color: msg.role === "user" ? "#ffffff" : "var(--text-main)",
                      padding: "10px 16px",
                      borderRadius: "16px",
                      borderBottomRightRadius: msg.role === "user" ? "2px" : "16px",
                      borderBottomLeftRadius: msg.role === "assistant" ? "2px" : "16px",
                      maxWidth: "85%",
                      fontSize: "0.9rem",
                      lineHeight: "1.45",
                      border: msg.role === "assistant" ? "1px solid var(--glass-border)" : "none"
                    }}
                  >
                    {msg.content}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            {/* Geolocation assistance */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <GlassButton 
                type="button" 
                onClick={handleGetLocation} 
                disabled={locating}
                variant="outline" 
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
              >
                <FaMapMarkerAlt /> {locating ? "Acquiring..." : "Use My Location"}
              </GlassButton>
              {location && (
                <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 700 }}>
                  Location Active
                </span>
              )}
              {locMessage && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{locMessage}</span>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "8px 12px", marginBottom: 12 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAnalyze} style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder={
                  lastAnalysis?.status === "needs_clarification" 
                    ? "Type your answer here..." 
                    : "Describe the issue you're facing..."
                }
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="form-control"
                style={{ flex: 1, height: "42px" }}
                disabled={loading}
                required
              />
              <GlassButton 
                type="submit" 
                variant="primary" 
                style={{ height: "42px", padding: '0 20px' }}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Send"}
              </GlassButton>
            </form>
          </div>

        </GlassCard>

        {/* Right Column: Results & Matched Providers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Analysis Summary Card */}
          <AnimatePresence>
            {lastAnalysis && (
              <motion.div 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
              >
                <GlassCard hoverLift={false} style={{ padding: 28 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 16px 0", background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
                    AI Analysis Result
                  </h3>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    <span className={`badge ${lastAnalysis.status === 'matched' ? 'badge-success' : lastAnalysis.status === 'needs_clarification' ? 'badge-warning' : 'badge-danger'}`}>
                      {lastAnalysis.status.toUpperCase().replace('_', ' ')}
                    </span>
                    {lastAnalysis.serviceCategory && (
                      <span className="badge badge-accent">
                        {lastAnalysis.serviceCategory}
                      </span>
                    )}
                    {lastAnalysis.urgency && (
                      <span className={`badge ${getUrgencyBadgeClass(lastAnalysis.urgency)}`}>
                        {lastAnalysis.urgency} Urgency
                      </span>
                    )}
                  </div>

                  {lastAnalysis.issueSummary && (
                    <div style={{ marginBottom: 16, textAlign: 'left' }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-light)", display: "block", textTransform: 'uppercase', fontWeight: 700 }}>Problem Summary</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>{lastAnalysis.issueSummary}</span>
                    </div>
                  )}

                  {lastAnalysis.recommendation && (
                    <div style={{ padding: "12px 16px", backgroundColor: "rgba(6, 182, 212, 0.05)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--accent)", marginBottom: 0, textAlign: 'left' }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, fontWeight: "bold" }}>
                        <FaCheckCircle /> Recommended Action / Safety Advice
                      </span>
                      <p style={{ margin: "6px 0 0 0", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                        {lastAnalysis.recommendation}
                      </p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Providers Grid */}
          <GlassCard hoverLift={false} style={{ flex: 1, padding: 28 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 20px 0", background: 'none', WebkitTextFillColor: 'initial', color: 'var(--text-main)' }}>
              Matching Service Providers
            </h3>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2].map(n => (
                  <div key={n} className="skeleton-card" style={{ height: "100px" }}></div>
                ))}
              </div>
            ) : lastAnalysis?.status !== "matched" ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-light)" }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Matched providers will appear here once the service category is successfully identified.</p>
              </div>
            ) : matchedProviders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-light)" }}>
                <FaExclamationTriangle size={30} style={{ color: "var(--warning)", marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>No verified and available providers found in this area for this category. Please try a different location or check back later.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {matchedProviders.map(provider => (
                  <GlassCard 
                    key={provider.provider_id}
                    hoverLift={true}
                    style={{ 
                      padding: "20px", 
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", fontWeight: 800, color: 'var(--text-main)', background: 'none', WebkitTextFillColor: 'initial' }}>
                          {provider.name}
                        </h4>
                        <div style={{ display: "flex", gap: 10, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <FaStar color="#f59e0b" /> {Number(provider.average_rating || 0).toFixed(1)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <FaBriefcase /> {provider.experience} yrs exp
                          </span>
                          {provider.distance_km !== null && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <FaMapMarkerAlt /> {Number(provider.distance_km).toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Match Score</div>
                        <span className="badge badge-success" style={{ fontWeight: "bold", fontSize: "0.8rem", marginTop: 4 }}>
                          {provider.matchScore}% Match
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: "0 0 14px 0", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                      {provider.description || "No additional description provided."}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>
                        {provider.matchReason}
                      </span>
                      <GlassButton 
                        onClick={() => navigate(`/providers/${provider.provider_id}`)}
                        variant="primary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        View & Book <FaChevronRight size={10} />
                      </GlassButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

          </GlassCard>

        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default AIServiceAssistant;
