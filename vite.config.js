import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import base44 from '@base44/vite-plugin'  // ← AÑADE ESTA LÍNEA

export default defineConfig({
  plugins: [
    react(),
    base44(),  // ← AÑADE ESTA LÍNEA
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
})
