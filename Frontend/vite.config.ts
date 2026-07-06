import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Push-only service worker (src/sw.ts). injectManifest with NO injected
      // precache manifest means the SW has no fetch handler and no caching — it
      // can never serve the stale, app-breaking bundles the previous precache SW
      // did. It exists solely to receive Web Push + show notifications.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        // Precache nothing — the SW references __WB_MANIFEST only to satisfy the
        // injection point; it never calls precacheAndRoute, so there is no fetch
        // handler and no stale-bundle risk.
        globPatterns: [],
      },
      registerType: "autoUpdate",
      manifestFilename: "manifest.json",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "icons/apple-touch-icon.png",
        "icon-source.svg",
      ],
      manifest: {
        name: "TapByWisein",
        short_name: "TapByWisein",
        description: "Network at events with TapByWisein — scan, tap, connect.",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/dashboard",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png",          sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png",          sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split large, rarely-changing vendor libs into their own chunks so they
    // cache independently of app code and don't bloat any single route chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "charts": ["recharts"],
          "motion": ["framer-motion"],
          "query": ["@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
