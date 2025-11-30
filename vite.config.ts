import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Supprimer tous les console.* en production
    dropConsole: true,
  },
  base: '/', // ✅ Utiliser chemin absolu pour éviter les problèmes avec les routes /meeting/*
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // ✅ Enable sourcemaps for debugging TDZ errors
    // PERF: Code-splitting pour réduire le bundle initial
    rollupOptions: {
      output: {
        manualChunks: {
          // PERF: Séparer les vendors lourds
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-video': ['@daily-co/daily-js', '@daily-co/daily-react'],
        },
        // PERF: Noms de fichiers avec hash pour cache à long terme
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // PERF: Augmenter le seuil de warning pour les gros chunks (temporaire)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // PERF: Preload hints pour développement
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/components/routing/AppRouter.tsx',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    // PERF: Pre-bundle les dépendances lourdes
    include: [
      'react',
      'react-dom',
      'framer-motion',
    ],
  },
});