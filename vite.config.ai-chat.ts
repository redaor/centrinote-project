import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

import { resolve } from 'path';



// @ts-ignore

export default defineConfig({

  plugins: [react()],

  build: {

    lib: {

      entry: resolve(__dirname, 'src/features/ai-chat/index.ts'),

      name: 'AIChat',

      fileName: 'ai-chat',

      formats: ['es']

    },

    rollupOptions: {

      external: ['react', 'react-dom']

    }

  }

});
