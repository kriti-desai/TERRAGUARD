import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'plotly-vendor': ['plotly.js', 'react-plotly.js'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          'charts-vendor': ['recharts'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/datasets': 'http://localhost:8000',
      '/analysis': 'http://localhost:8000',
      '/risk': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/reports': 'http://localhost:8000',
    }
  }
})
