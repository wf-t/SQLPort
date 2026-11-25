import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// A separate configuration keeps the desktop build and its Wails runtime intact.
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: [{
      find: /^@wailsio\/runtime$/,
      replacement: fileURLToPath(new URL('./src/api/demo/runtime.ts', import.meta.url)),
    }],
  },
  define: {
    'import.meta.env.VITE_JIAORONG_DEMO': JSON.stringify('true'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('dev'),
  },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  build: { outDir: '../demo/jiaorong/web-ui', emptyOutDir: true },
})
