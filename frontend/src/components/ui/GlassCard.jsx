import { motion } from "framer-motion";

/**
 * Reusable frosted glass card.
 * Uses Framer Motion for responsive hover lift and glow transitions.
 */
const GlassCard = ({
  children,
  onClick,
  style = {},
  className = "",
  hoverLift = true,
  glow = false
}) => {
  return (
    <motion.div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
        boxShadow: var(--shadow-md),
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
      className={`glass-card-container ${className}`}
      whileHover={hoverLift ? {
        y: -6,
        borderColor: "var(--glass-border-hover)",
        boxShadow: glow 
          ? "var(--shadow-lg), 0 10px 30px rgba(6, 182, 212, 0.15)"
          : "var(--shadow-lg), 0 10px 35px rgba(0, 0, 0, 0.55)",
      } : {}}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Aurora glow stripe at the very top of the card */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%)",
          pointerEvents: "none"
        }}
      />
      {children}
    </motion.div>
  );
};

export default GlassCard;
