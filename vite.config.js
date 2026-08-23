import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',           // deliberate update behavior (PLAT-02)
      manifest: {
        name: 'AppSpecReady.ai',
        short_name: 'AppSpecReady',
        description: 'Know what to build before paying an AI to build it.',
        theme_color: '#3b5bdb',
        background_color: '#f7f8fc',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Never cache private project data indiscriminately (PLAT-02):
        // only static app shell assets are precached; all /rest/ and /auth/ calls are network-only.
        navigateFallback: 'index.html',
        runtimeCaching: []
      }
    })
  ]
});
