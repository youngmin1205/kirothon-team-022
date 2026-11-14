import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 포트와 출력 경로를 고정한다.
// - 5173: 개발용 화면. 팀원 전원이 같은 주소를 본다
// - /api → 8000: 백엔드. 프런트 코드에 호스트를 박지 않기 위한 프록시
// - build → backend/static_dist: 배포 시 FastAPI 하나가 전부 서빙한다(단일 프로세스)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 포트가 바뀌면 녹화·smoke 설정이 어긋난다. 조용히 옮기지 않는다
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/static_dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
