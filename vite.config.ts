import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    legacy({
      // 覆盖到较老移动端浏览器
      targets: ['defaults', 'ios_saf >= 10', 'android >= 5', 'chrome >= 49', 'safari >= 10'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    })
  ],
  server: {
    port: 5174,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
})