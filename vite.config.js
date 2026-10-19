import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端端口可通过环境变量覆盖（默认 8000）。
// 用途：本机 8000 被其他项目占用时，如 BACKEND_PORT=8001 起后端 + 本变量代理。
const backendPort = process.env.BACKEND_PORT || '8000'
const backendTarget = `http://localhost:${backendPort}`

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/v1': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})
