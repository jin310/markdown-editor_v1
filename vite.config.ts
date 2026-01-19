import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    // 确保 process.env 在浏览器中可用，防止 GeminiService 初始化崩溃
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000
  }
});