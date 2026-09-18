import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy: forward /api to the local FastAPI server so the frontend
// and the Python prediction API can run side-by-side during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          motion: ["framer-motion"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
