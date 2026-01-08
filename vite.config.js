import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: [
      'ta-01kefkyhbqvw1720cj1wvg74z8-5173.wo-hjnvra6nj7a427e42226w9k84.w.modal.host'
    ]
  }
})
