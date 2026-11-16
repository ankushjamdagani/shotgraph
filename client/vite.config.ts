import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.STUDIO_CLIENT_PORT || 3000),
    proxy: {
      '/api': process.env.STUDIO_API_URL || 'http://127.0.0.1:3030',
      '/media': process.env.STUDIO_API_URL || 'http://127.0.0.1:3030',
      '/ws': {
        target: (process.env.STUDIO_API_URL || 'http://127.0.0.1:3030').replace('http','ws'),
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
