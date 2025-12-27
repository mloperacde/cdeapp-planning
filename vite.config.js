import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// NO importes '@tailwindcss/vite' si no lo instalaste

export default defineConfig({
  plugins: [react()],
});
