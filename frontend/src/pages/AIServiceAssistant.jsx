import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { 
  FaArrowLeft, 
  FaRobot, 
  FaMapMarkerAlt, 
  FaStar, 
  FaTools, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaSync, 
  FaBriefcase,
  FaChevronRight
} from "react-icons/fa";

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

    // Build conversation context for backend format
    // Backend expects array of: { role: 'user' | 'model', content: '...' }
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
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px", boxSizing: "border-box", width: "100%" }}>
      
      {/* Top navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={() => navigate("/user/home")} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FaArrowLeft /> Back to Home
        </button>
        <button onClick={handleReset} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FaSync /> Start New Analysis
        </button>
      </div>

      {/* Hero Header */}
      <div 
        className="card animate-fade-up" 
        style={{ 
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#ffffff",
          marginBottom: 30,
          border: "none",
          textAlign: "left"
        }}
      >
        <h1 style={{ color: "#ffffff", fontSize: "2rem", fontWeight: 900, marginBottom: 8, letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 12 }}>
          <FaRobot /> AI Local Service Assistant
        </h1>
        <p style={{ color: "var(--primary-light)", fontSize: "1rem", margin: 0, maxWidth: 640 }}>
          Describe your problem in plain words, and our AI will automatically identify the category, offer safety guidance, and match you with the best available local providers.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }} className="responsive-grid">
        
        {/* Left Column: Chat Conversation */}
        <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: "450px", justifyContent: "space-between" }}>
          
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
              AI Conversation Log
            </h3>
            
            {conversation.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                <FaRobot size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
                <p style={{ margin: 0 }}>Type your issue below to get started. You can type in simple words like: <em>"My kitchen sink is leaking water everywhere"</em> or <em>"Power cut only in my room"</em>.</p>
              </div>
            ) : (
              <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 5 }}>
                {conversation.map((msg, index) => (
                  <div 
                    key={index}
                    style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      background: msg.role === "user" ? "var(--primary)" : "var(--bg-app)",
                      color: msg.role === "user" ? "#ffffff" : "var(--text-main)",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      borderBottomRightRadius: msg.role === "user" ? "2px" : "12px",
                      borderBottomLeftRadius: msg.role === "assistant" ? "2px" : "12px",
                      maxWidth: "85%",
                      fontSize: "0.9rem",
                      lineHeight: "1.4"
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            {/* Geolocation assistance */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <button 
                type="button" 
                onClick={handleGetLocation} 
                disabled={locating}
                className="btn-outline" 
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
              >
                <FaMapMarkerAlt /> {locating ? "Acquiring..." : "Use My Location"}
              </button>
              {location && (
                <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>
                  Location Active
                </span>
              )}
              {locMessage && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{locMessage}</span>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "8px 12px", marginBottom: 10 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAnalyze} style={{ display: "flex", gap: 8 }}>
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
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ height: "42px", display: "flex", alignItems: "center", gap: 6 }}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Send"}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Results & Matched Providers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Analysis Summary Card */}
          {lastAnalysis && (
            <div className="card animate-fade-up">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 12px 0" }}>
                AI Analysis Result
              </h3>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span className={`badge ${lastAnalysis.status === 'matched' ? 'badge-success' : lastAnalysis.status === 'needs_clarification' ? 'badge-warning' : 'badge-danger'}`}>
                  Status: {lastAnalysis.status.toUpperCase().replace('_', ' ')}
                </span>
                {lastAnalysis.serviceCategory && (
                  <span className="badge badge-accent">
                    Category: {lastAnalysis.serviceCategory}
                  </span>
                )}
                {lastAnalysis.urgency && (
                  <span className={`badge ${getUrgencyBadgeClass(lastAnalysis.urgency)}`}>
                    Urgency: {lastAnalysis.urgency}
                  </span>
                )}
              </div>

              {lastAnalysis.issueSummary && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Problem Summary</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{lastAnalysis.issueSummary}</span>
                </div>
              )}

              {lastAnalysis.recommendation && (
                <div style={{ padding: "10px 14px", backgroundColor: "var(--accent-light)", borderRadius: "var(--radius-sm)", borderLeft: "4px solid var(--accent)", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, fontWeight: "bold" }}>
                    <FaCheckCircle style={{ color: "var(--accent)" }} /> Recommended Action / Safety Advice
                  </span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "var(--text-main)" }}>
                    {lastAnalysis.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Providers Grid */}
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px 0" }}>
              Matching Service Providers
            </h3>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2].map(n => (
                  <div key={n} className="skeleton-card" style={{ height: "100px" }}></div>
                ))}
              </div>
            ) : lastAnalysis?.status !== "matched" ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                <p style={{ margin: 0 }}>Matched providers will appear here once the service category is successfully identified.</p>
              </div>
            ) : matchedProviders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                <FaExclamationTriangle size={30} style={{ color: "var(--warning)", marginBottom: 10 }} />
                <p style={{ margin: 0 }}>No verified and available providers found in this area for this category. Please try a different location or check back later.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {matchedProviders.map(provider => (
                  <div 
                    key={provider.provider_id}
                    className="card-lift"
                    style={{ 
                      padding: "16px", 
                      borderRadius: "var(--radius-md)", 
                      border: "1px solid var(--border-color)", 
                      background: "var(--bg-card)",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>
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
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Match Score</div>
                        <span className="badge badge-success" style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                          {provider.matchScore}% Match
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {provider.description || "No additional description provided."}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 500 }}>
                        {provider.matchReason}
                      </span>
                      <button 
                        onClick={() => navigate(`/providers/${provider.provider_id}`)}
                        className="btn-primary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        View & Book <FaChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default AIServiceAssistant;
