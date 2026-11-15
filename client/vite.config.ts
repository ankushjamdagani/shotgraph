import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:3030',
      '/media': 'http://127.0.0.1:3030',
      '/ws': {
        target: 'ws://127.0.0.1:3030',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_three: ['three'],
          vendor_xyflow: ['@xyflow/react'],
          vendor_lucide: ['lucide-react'],
        },
      },
    },
  },
});
