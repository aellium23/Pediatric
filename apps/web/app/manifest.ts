import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HOC — Healthcare on Call',
    short_name: 'HOC',
    description: 'O pediatra de confiança, à distância de uma mensagem. Uma solução DES.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#16233b',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
