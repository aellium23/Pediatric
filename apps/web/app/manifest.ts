import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HOC — Healthcare on Call',
    short_name: 'HOC',
    description: 'O pediatra de confiança, à distância de uma mensagem. Uma solução DES.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#f6f7f9',
    theme_color: '#1b2b4b',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
