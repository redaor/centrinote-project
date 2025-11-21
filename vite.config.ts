import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // ✅ Utiliser chemin absolu pour éviter les problèmes avec les routes /meeting/*
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // ✅ Enable sourcemaps for debugging TDZ errors
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});