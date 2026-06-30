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
      // The precache service worker repeatedly served stale, app-breaking
      // bundles. Self-destroying SW unregisters any installed worker and clears
      // its caches on next load, rescuing every client onto the live bundle.
      // (A hardened network-first SW can be reintroduced later if offline is needed.)
      selfDestroying: true,
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
      workbox: {
        navigateFallback: "/index.html",
        // Don't precache the API or auth-bearing requests; runtime cache
        // handles GETs that are safe to cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/og\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "img-cache",
              expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
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
