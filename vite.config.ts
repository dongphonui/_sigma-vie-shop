
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
    sourcemap: false
  },
  define: {
    // Đảm bảo process.env.API_KEY được ưu tiên lấy từ môi trường hệ thống (Vercel)
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
})
