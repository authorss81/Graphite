import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Graphite — Notes & Canvas',
        short_name: 'Graphite',
        description: 'Local-first note-taking with AI, canvas, and end-to-end encryption.',
        theme_color: '#0f0f14',
        background_color: '#0f0f14',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'utilities'],
        shortcuts: [
          {
            name: 'New Note',
            short_name: 'New',
            description: 'Create a new note',
            url: '/?new=1',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache all app shell assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Limit cache size — allow up to 3MB for vendor chunks (Excalidraw/Lexical)
        maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [
          {
            // Cache Supabase API responses for offline reads
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 4,
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
        ],
      },
      devOptions: {
        // Enable service worker in dev mode for testing
        enabled: false,
      },
    }),
  ],
})
