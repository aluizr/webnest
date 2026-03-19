import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    cors: {
      origin: process.env.VITE_APP_URL || "http://localhost:8080",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    },
    headers: {
      "Content-Security-Policy": `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ${mode === "development" ? "'unsafe-inline'" : "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='"}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://noembed.com https://api.microlink.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`,
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode !== "production",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
              return "vendor-react";
            }
            if (id.includes("lucide-react") || id.includes("clsx") || id.includes("class-variance-authority") || id.includes("tailwind-merge")) {
              return "vendor-ui-utils";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            // Keep charts attached to lazy stats chunks instead of forcing a shared global chunk.
            if (id.includes("@tiptap") || id.includes("prosemirror")) {
              return "vendor-editor";
            }
            if (id.includes("zod") || id.includes("date-fns")) {
              return "vendor-utils";
            }
          }
        },
      },
    },
  },
}));