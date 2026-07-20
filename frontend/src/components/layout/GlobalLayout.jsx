import { motion } from "framer-motion";

/**
 * Premium layout wrapper.
 * Emits ambient floating aurora blobs in the background using CSS keyframes.
 * Enforces vertical flex structure with sticky footer constraints.
 */
const GlobalLayout = ({ children }) => {
  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--bg-app)",
      overflow: "hidden",
      boxSizing: "border-box"
    }}>
      {/* 1. Animated Ambient Aurora Blobs */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}>
        {/* Purple top glow */}
        <div style={{
          position: "absolute",
          top: "-15%",
          left: "20%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.02) 70%, transparent 100%)",
          filter: "blur(80px)",
          animation: "floatBlob1 25s infinite alternate ease-in-out"
        }} />

        {/* Blue middle glow */}
        <div style={{
          position: "absolute",
          top: "40%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.01) 75%, transparent 100%)",
          filter: "blur(60px)",
          animation: "floatBlob2 20s infinite alternate ease-in-out"
        }} />

        {/* Cyan bottom-left glow */}
        <div style={{
          position: "absolute",
          bottom: "10%",
          left: "-10%",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0) 70%, transparent 100%)",
          filter: "blur(70px)",
          animation: "floatBlob3 22s infinite alternate ease-in-out"
        }} />
      </div>

      {/* 2. Soft Noise Texture Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.015,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* 3. Main Content Outlet Wrapper */}
      <main style={{
        position: "relative",
        zIndex: 2,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {children}
      </main>

      {/* CSS Animation Keyframes for Aurora Blobs (optimized) */}
      <style>{`
        @keyframes floatBlob1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.1); }
          100% { transform: translate(-30px, 50px) scale(0.95); }
        }
        @keyframes floatBlob2 {
          0% { transform: translate(0, 0) scale(0.95); }
          50% { transform: translate(-40px, -50px) scale(1.05); }
          100% { transform: translate(30px, 20px) scale(1); }
        }
        @keyframes floatBlob3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(0.9); }
          100% { transform: translate(-40px, 40px) scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default GlobalLayout;
