import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3031,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://localhost:3016', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3016', ws: true, changeOrigin: true }
    }
  },
  preview: {
    port: 3031,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://localhost:3016', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3016', ws: true, changeOrigin: true }
    }
  }
})
