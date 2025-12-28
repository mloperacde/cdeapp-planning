import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'ta-01kdh44kwvcq98v3k52dg75k5a-5173.wo-e4jyv0c7tb4kme8lf4gyo2gyo.w.modal.host',
      '.modal.host'  // Permite todos los subdominios de modal.host
    ],
    host: true,  // Importante para Base44
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true
  }
})
