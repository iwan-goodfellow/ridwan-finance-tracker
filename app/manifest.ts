import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Retroholic Finance',
    short_name: 'Retroholic',
    description: 'Vintage Finance Tracker by Ridwan',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4ecd8',
    theme_color: '#7a1c4b',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}