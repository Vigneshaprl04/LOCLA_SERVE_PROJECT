import { motion } from "framer-motion";

/**
 * Reusable premium 3D-orbit loading spinner.
 * Standardized across screens to provide a premium brand identity on wait states.
 */
const Loader = ({ size = 60, text = "Loading LocalServe..." }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Core Center Sphere */}
        <motion.div
          style={{
            position: "absolute",
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            top: "30%",
            left: "30%",
            boxShadow: "0 0 20px var(--primary-glow)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Orbit Circle 1 */}
        <motion.div
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            border: "2px solid rgba(6, 182, 212, 0.3)",
            borderTopColor: "var(--accent)",
            boxSizing: "border-box"
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Orbit Circle 2 */}
        <motion.div
          style={{
            position: "absolute",
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: "50%",
            border: "1px dashed rgba(124, 58, 237, 0.4)",
            borderBottomColor: "var(--primary)",
            top: "12.5%",
            left: "12.5%",
            boxSizing: "border-box"
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {text && (
        <motion.p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            fontWeight: "500",
            letterSpacing: "0.05em",
            margin: 0
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default Loader;
