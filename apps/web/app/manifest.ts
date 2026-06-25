import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pédia — Telepediatria',
    short_name: 'Pédia',
    description: 'O pediatra de confiança, à distância de uma mensagem.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#0e7c74',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
