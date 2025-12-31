import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Plugin } from 'vite';

// Plugin personnalisé pour exclure les fichiers .md du build
function excludeMarkdownPlugin(): Plugin {
  return {
    name: 'exclude-markdown',
    generateBundle(_, bundle) {
      // Supprimer tous les fichiers .md du bundle final
      Object.keys(bundle).forEach(fileName => {
        if (fileName.endsWith('.md')) {
          delete bundle[fileName];
          console.log(`[Build] Fichier .md exclu du build: ${fileName}`);
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // ✅ Utiliser chemin absolu pour éviter les problèmes avec les routes /meeting/*
  plugins: [
    react(),
    excludeMarkdownPlugin(), // Exclure les fichiers .md
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // ✅ Enable sourcemaps for debugging TDZ errors
    // SEO: Copier uniquement les fichiers nécessaires du dossier public
    // Les fichiers .md de documentation ne doivent pas être déployés
    copyPublicDir: true,
    // PERF: Code-splitting pour réduire le bundle initial
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // PERF: Séparer les vendors lourds
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@daily-co')) {
              return 'vendor-video';
            }
            // Tout autre node_modules → vendor-libs
            return 'vendor-libs';
          }

          // PERF: Séparer les features lourdes en lazy chunks
          if (id.includes('/src/features/ai-chat')) {
            return 'feature-ai-chat';
          }
          if (id.includes('/src/features/ghost-text')) {
            return 'feature-ghost-text';
          }
          if (id.includes('/src/components/meetings')) {
            return 'feature-meetings';
          }
          if (id.includes('/src/components/vocabulary')) {
            return 'feature-vocabulary';
          }
          if (id.includes('/src/components/automation')) {
            return 'feature-automation';
          }
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