import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    // Required so Docker container is reachable externally
    host: true,

    // Keep fixed port so Caddy always knows where Vite lives
    port: 5173,
    strictPort: true,

    // Explicitly allow reverse-proxy hostname
    allowedHosts: ["gcs.local"]
  }
});
