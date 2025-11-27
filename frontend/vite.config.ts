import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for assets (required for Electron file:// protocol)
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Listen on all addresses
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

