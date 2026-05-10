import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // 127.0.0.1 avoids some IPv6(::1) vs IPv4-only listener mismatches on "localhost"
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Exclude server from the build
    rollupOptions: {
      external: ['server/*'],
    },
  },
  optimizeDeps: {
    exclude: ['server'],
  },
})
