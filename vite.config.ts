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
    // Proxy pour les fonctions Netlify en développement
    // Note: Nécessite que Netlify Dev soit lancé sur le port 8888
    // Utilisez `netlify dev` au lieu de `npm run dev` pour avoir les fonctions disponibles
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Garder le chemin tel quel
        // Gérer les erreurs de connexion
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('⚠️ [Vite Proxy] Erreur de connexion à Netlify Dev:', err.message);
            console.warn('💡 Astuce: Lancez "netlify dev" dans un autre terminal pour activer les fonctions Netlify');
          });
        },
      },
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