// vite.config.js - VERSIÓN CORREGIDA
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: true,
    hmr: {
      overlay: false,  // Desactiva overlay temporalmente
    },
  },
})
