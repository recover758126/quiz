import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    legacy({
      // 覆盖到较老移动端浏览器
      targets: ['defaults', 'ios_saf >= 10', 'android >= 5', 'chrome >= 49', 'safari >= 10'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '题库练习',
        short_name: '练题',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#0d6efd',
        background_color: '#ffffff',
        description: '离线练题与错题优先的学习工具',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html'
      }
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