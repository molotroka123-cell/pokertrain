import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('/src/engine/')) {
            return 'engine';
          }
          if (id.includes('/src/drills/leak/data/')) {
            return 'drilldata';
          }
        },
      },
    },
  },
});
