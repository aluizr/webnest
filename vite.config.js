import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    cors: {
      origin: process.env.VITE_APP_URL || 'http://localhost:8080',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    },
    headers: {
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; worker-src * blob:;",
      // Adicione outros headers necessários para dev abaixo, se quiser
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
          }
        },
      },
    },
  },
});