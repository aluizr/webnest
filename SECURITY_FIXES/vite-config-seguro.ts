// vite.config.ts - VERSÃO COM HEADERS DE SEGURANÇA
// Use este arquivo para substituir o atual

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // ✅ CORS seguro
    cors: {
      origin: process.env.VITE_APP_URL || 'http://localhost:8080',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    // ✅ Headers de segurança
    headers: {
      // Previne clickjacking
      'X-Frame-Options': 'DENY',
      // Previne MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      // Ativa proteção de XSS no navegador
      'X-XSS-Protection': '1; mode=block',
      // Força HTTPS
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Permissions Policy (antes Feature-Policy)
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
    middlewareMode: false,
  },
  plugins: [
    react(),
    // Component tagger disabled
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // ✅ Otimizações de segurança em build
    sourcemap: mode !== 'production', // Não expor source maps em prod
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar código de terceiros
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
        },
      },
    },
    // Habilitar minification
    minify: 'terser',
  },
}));
