import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'ta-01kdge0mgeee2ynvp3r34kqmyf-5173.wo-gst0pxk9x5561n5uewg43v7i5.w.modal.host'
    ]
  }
})
