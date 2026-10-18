import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spacing Inspector',
    short_name: 'Spacing Inspector',
    description: 'Free Chrome extension to inspect margin and padding on any website.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07070B',
    theme_color: '#07070B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
}
