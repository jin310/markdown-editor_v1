
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    // 确保在 CI/CD 环境变量中定义的 API_KEY 能注入到前端代码
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  },
  server: {
    port: 3000
  }
});
