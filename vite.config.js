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
      "Content-Security-Policy": `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ${mode === "development" ? "'unsafe-inline'" : "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='"}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://noembed.com https://api.microlink.io https://*.microlink.io https://api.notion.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`,
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
            const rawUrl = new URL(req.url, "http://localhost:8080").searchParams.get("url");
            
            console.log("[og-proxy] Request:", rawUrl);
            
            if (!rawUrl) { 
              console.error("[og-proxy] Missing url parameter");
              res.statusCode = 400; 
              res.end("Missing url parameter"); 
              return; 
            }

            // Validate URL format
            try {
              new URL(rawUrl);
            } catch (e) {
              console.error("[og-proxy] Invalid URL format:", rawUrl, e.message);
              res.statusCode = 400;
              res.end("Invalid URL format");
              return;
            }

            const fetchUrl = (urlStr, redirectCount = 0) => {
              if (redirectCount > 5) { 
                console.error("[og-proxy] Too many redirects for:", urlStr);
                res.statusCode = 502; 
                res.end("Too many redirects"); 
                return; 
              }
              
              let target;
              try { 
                target = new URL(urlStr); 
              } catch (e) { 
                console.error("[og-proxy] Invalid URL:", urlStr, e.message);
                res.statusCode = 400; 
                res.end("Invalid url"); 
                return; 
              }
              
              console.log("[og-proxy] Fetching:", target.href);
              
              const client = target.protocol === "https:" ? https : http;
              const options = {
                hostname: target.hostname,
                path: target.pathname + target.search,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                  "Accept-Language": "en-US,en;q=0.9",
                  "Accept-Encoding": "gzip, deflate, br",
                  "Referer": target.origin + "/",
                  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": '"Windows"',
                  "sec-fetch-dest": "image",
                  "sec-fetch-mode": "no-cors",
                  "sec-fetch-site": "same-origin",
                  "DNT": "1",
                },
              };
              
              client.get(options, (upstream) => {
                console.log("[og-proxy] Response status:", upstream.statusCode);
                
                // Follow redirects
                if ([301, 302, 303, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
                  upstream.resume();
                  const next = upstream.headers.location.startsWith("http")
                    ? upstream.headers.location
                    : `${target.origin}${upstream.headers.location}`;
                  console.log("[og-proxy] Redirecting to:", next);
                  return fetchUrl(next, redirectCount + 1);
                }
                
                // Handle error status codes
                if (upstream.statusCode >= 400) {
                  console.error("[og-proxy] Upstream error:", upstream.statusCode, urlStr);
                  
                  // Try fallback for known sites with broken OG images
                  if (upstream.statusCode === 404) {
                    const hostname = target.hostname;
                    
                    // Kaggle fallback
                    if (hostname.includes('kaggle.com')) {
                      console.log("[og-proxy] Trying Kaggle fallback logo");
                      upstream.resume();
                      return fetchUrl("https://www.kaggle.com/static/images/site-logo.svg", redirectCount);
                    }
                    
                    // Joblib fallback
                    if (hostname.includes('joblib.readthedocs.io')) {
                      console.log("[og-proxy] Trying Joblib fallback logo");
                      upstream.resume();
                      return fetchUrl("https://joblib.readthedocs.io/en/stable/_static/joblib_logo.svg", redirectCount);
                    }
                  }
                  
                  res.statusCode = upstream.statusCode;
                  res.end(`Upstream error: ${upstream.statusCode}`);
                  return;
                }
                
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                res.setHeader("Access-Control-Allow-Origin", "*");
                const contentType = upstream.headers["content-type"] || "image/jpeg";
                res.setHeader("Content-Type", contentType);
                res.setHeader("Cache-Control", "public, max-age=86400");
                
                // Log SVG specifically for debugging
                if (contentType.includes("svg")) {
                  console.log("[og-proxy] Serving SVG:", urlStr);
                }
                
                res.statusCode = 200;
                upstream.pipe(res);
              }).on("error", (err) => {
                console.error("[og-proxy] Network error:", err.message, "for URL:", urlStr);
                res.statusCode = 502; 
                res.end("Proxy error: " + err.message);
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