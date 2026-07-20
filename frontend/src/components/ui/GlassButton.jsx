import { motion } from "framer-motion";

/**
 * Reusable premium animated glass button.
 * Uses Framer Motion for responsive hover scaling and tap feedback.
 */
const GlassButton = ({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, outline, danger
  disabled = false,
  style = {},
  className = "",
  glow = true
}) => {
  const getStyles = () => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "inherit",
      fontSize: "0.875rem",
      fontWeight: "600",
      borderRadius: "var(--radius-md)",
      padding: "12px 24px",
      cursor: disabled ? "not-allowed" : "pointer",
      border: "1px solid transparent",
      gap: "8px",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      boxSizing: "border-box",
      opacity: disabled ? 0.6 : 1,
      ...style
    };

    switch (variant) {
      case "primary":
        return {
          ...base,
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: glow && !disabled ? "0 4px 20px var(--primary-glow)" : "var(--shadow-sm)"
        };
      case "secondary":
        return {
          ...base,
          background: "rgba(255, 255, 255, 0.06)",
          color: "var(--text-main)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(10px)",
          boxShadow: glow && !disabled ? "0 4px 15px rgba(255, 255, 255, 0.05)" : "none"
        };
      case "outline":
        return {
          ...base,
          background: "transparent",
          borderColor: "var(--glass-border)",
          color: "var(--text-main)",
          boxShadow: "none"
        };
      case "danger":
        return {
          ...base,
          background: "rgba(239, 68, 68, 0.15)",
          color: "#fca5a5",
          borderColor: "rgba(239, 68, 68, 0.3)",
          boxShadow: glow && !disabled ? "0 4px 15px var(--error-glow)" : "none"
        };
      default:
        return base;
    }
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={getStyles()}
      className={`btn-ui ${className}`}
      whileHover={!disabled ? { 
        scale: 1.02, 
        y: -1,
        borderColor: variant === "outline" ? "var(--accent)" : "rgba(255, 255, 255, 0.25)",
        boxShadow: variant === "outline" ? "0 0 15px rgba(6, 182, 212, 0.2)" : undefined
      } : {}}
      whileTap={!disabled ? { scale: 0.98, y: 0 } : {}}
    >
      {children}
    </motion.button>
  );
};

export default GlassButton;
