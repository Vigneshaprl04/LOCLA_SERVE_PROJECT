import { Link } from "react-router-dom";
import { FaCompass, FaTwitter, FaGithub, FaLinkedin, FaShieldAlt } from "react-icons/fa";

/**
 * Premium Footer displaying stats, links, categories, and branding.
 */
const Footer = () => {
  return (
    <footer style={{
      borderTop: "1px solid var(--glass-border)",
      background: "rgba(5, 8, 22, 0.4)",
      backdropFilter: "var(--glass-blur)",
      padding: "64px 0 32px 0",
      marginTop: "auto",
      color: "var(--text-muted)",
      boxSizing: "border-box"
    }}>
      <div className="container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "48px",
          marginBottom: "48px",
          textAlign: "left"
        }}>
          {/* Logo Brand Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Link to="/" style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1.35rem",
              fontWeight: 900,
              color: "var(--text-main)",
              letterSpacing: "-0.03em"
            }}>
              <FaCompass size={22} style={{ color: "var(--accent)" }} />
              <span style={{
                background: "var(--gradient-text)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>LocalServe</span>
            </Link>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
              On-demand verified local service marketplace. Connecting trusted local pros with homeowners instantly.
            </p>
            <div style={{ display: "flex", gap: "16px", color: "var(--text-light)" }}>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}><FaTwitter size={18} /></a>
              <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}><FaGithub size={18} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}><FaLinkedin size={18} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "var(--text-main)", fontSize: "1rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Marketplace</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
              <li><Link to="/user/home" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}>Find Services</Link></li>
              <li><Link to="/user/bookings" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}>My Bookings</Link></li>
              <li><Link to="/user/assistant" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}>AI Assistant</Link></li>
            </ul>
          </div>

          {/* Service Categories */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "var(--text-main)", fontSize: "1rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Services</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
              <li><span style={{ color: "inherit" }}>Cleaning Services</span></li>
              <li><span style={{ color: "inherit" }}>Electrician Support</span></li>
              <li><span style={{ color: "inherit" }}>Plumbing Services</span></li>
              <li><span style={{ color: "inherit" }}>Carpenter Support</span></li>
            </ul>
          </div>

          {/* Trust/Verification */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "var(--text-main)", fontSize: "1rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Security</h4>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.9rem", lineHeight: 1.4 }}>
              <FaShieldAlt size={20} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ margin: 0 }}>
                All local providers undergo identity checks, qualification reviews, and strict background screens.
              </p>
            </div>
          </div>

        </div>

        {/* Copy bar */}
        <div style={{
          borderTop: "1px solid var(--glass-border)",
          paddingTop: "24px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          fontSize: "0.85rem",
          color: "var(--text-light)"
        }}>
          <div>
            &copy; {new Date().getFullYear()} LocalServe. All rights reserved. Registered trademark.
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            <a href="/terms" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}>Terms of Service</a>
            <a href="/privacy" style={{ color: "inherit" }} onMouseEnter={(e)=>e.target.style.color="var(--accent)"} onMouseLeave={(e)=>e.target.style.color="inherit"}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
