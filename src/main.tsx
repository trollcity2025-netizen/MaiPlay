import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

const isProd = import.meta.env.PROD

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (isProd) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('SW registered:', registration)
      } catch (error) {
        console.log('SW registration failed:', error)
      }
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations()

      await Promise.all(
        registrations.map((registration) => registration.unregister())
      )

      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }

      console.log('SW disabled and caches cleared in development')
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)