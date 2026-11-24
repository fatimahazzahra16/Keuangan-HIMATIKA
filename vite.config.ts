import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Chunk ekspor dan dependensinya (jspdf menarik html2canvas, dompurify, core-js).
const EKSPOR = ['eksporExcel', 'eksporPdf', 'html2canvas', 'purify.es', 'index.es']

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Versi baru tidak dipasang diam-diam: bendahara bisa sedang mengisi form.
      registerType: 'prompt',
      includeAssets: ['logo-himatika.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Keuangan HIMATIKA',
        short_name: 'HIMATIKA',
        description: 'Laporan keuangan HIMATIKA UIN Siber Syekh Nurjati Cirebon',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1F2A5A',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Hanya kerangka aplikasi yang disimpan. Library ekspor (besar) dimuat saat dipakai.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: EKSPOR.map((n) => `**/assets/${n}-*.js`),
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Data keuangan dan foto bukti (signed URL) tidak pernah disimpan di cache.
        runtimeCaching: [
          { urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'), handler: 'NetworkOnly' },
          {
            urlPattern: ({ url }) => EKSPOR.some((n) => url.pathname.startsWith(`/assets/${n}-`)),
            handler: 'CacheFirst',
            options: { cacheName: 'ekspor', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
})
