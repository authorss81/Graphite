import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@excalidraw/excalidraw/index.css'
import './index.css'
import App from './App.tsx'

// Register Service Worker for offline PWA functionality
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[Graphite PWA] New content available, reload to update.')
  },
  onOfflineReady() {
    console.log('[Graphite PWA] App ready to work offline.')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
