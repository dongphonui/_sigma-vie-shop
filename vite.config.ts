
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  },
  define: {
    // Đảm bảo process.env luôn là một object hợp lệ ngay cả khi không có key
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
})
