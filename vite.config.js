import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import https from "https";
import http from "http";

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
    plugins: [
      react(),
      {
        name: "og-image-proxy",
        configureServer(server) {
          server.middlewares.use("/og-proxy", (req, res) => {
            // req.url here is just the query string part: "?url=..."
            const qs = req.url.startsWith("?") ? req.url : `?${req.url}`;
            const rawUrl = new URLSearchParams(qs.slice(1)).get("url");
            if (!rawUrl) { res.statusCode = 400; res.end("Missing url"); return; }

            const fetchUrl = (urlStr, redirectCount = 0) => {
              if (redirectCount > 5) { res.statusCode = 502; res.end("Too many redirects"); return; }
              let target;
              try { target = new URL(urlStr); } catch { res.statusCode = 400; res.end("Invalid url"); return; }
              const client = target.protocol === "https:" ? https : http;
              const options = {
                hostname: target.hostname,
                path: target.pathname + target.search,
                headers: { "User-Agent": "Mozilla/5.0 (compatible; WebNest/1.0)" },
              };
              client.get(options, (upstream) => {
                // Follow redirects
                if ([301, 302, 303, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
                  upstream.resume();
                  const next = upstream.headers.location.startsWith("http")
                    ? upstream.headers.location
                    : `${target.origin}${upstream.headers.location}`;
                  return fetchUrl(next, redirectCount + 1);
                }
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", upstream.headers["content-type"] || "image/jpeg");
                res.statusCode = 200;
                upstream.pipe(res);
              }).on("error", (err) => {
                console.error("[og-proxy] error:", err.message);
                res.statusCode = 502; res.end("Proxy error");
              });
            };

            fetchUrl(rawUrl);
          });
        },
      },
    ],
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