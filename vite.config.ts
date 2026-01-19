
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    // 将环境变量注入到前端代码中
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000
  }
});
