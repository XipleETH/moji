import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar advertencias de módulos externos
        if (warning.code === 'UNRESOLVED_IMPORT') return
        warn(warning)
      }
    }
  }
});
