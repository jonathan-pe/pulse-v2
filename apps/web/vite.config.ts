import path from 'path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before @vitejs/plugin-react, per TanStack Router's docs
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Fixed rather than left to Vite's auto-fallback: BETTER_AUTH_URL and
    // trustedOrigins (apps/api/.env) are pinned to this exact origin, and a
    // silently-shifted port would break better-auth's origin check.
    port: 5173,
    strictPort: true,
    // Mirrors apps/web/vercel.json's production rewrite (app.playpulse.co ->
    // api.playpulse.co) so the browser sees a single same-origin server in
    // both environments — no CORS/cross-site cookie config needed.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
