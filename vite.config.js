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
    allowedHosts: [
      '.modal.host',
      '.wo-rt0d7kbu8q0xfzdf9zkcaikal.w.modal.host',
      'localhost',
      '127.0.0.1',
    ],
  },
})
