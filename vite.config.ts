import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Шахматный тренер',
        short_name: 'Шахматы',
        description: 'Разбор классических партий и тренировка ходов',
        theme_color: '#182218',
        background_color: '#f4f0e8',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'ru',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,wasm}'],
        maximumFileSizeToCacheInBytes: 9 * 1024 * 1024
      }
    })
  ]
})
