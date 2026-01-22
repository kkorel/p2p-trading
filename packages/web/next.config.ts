import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Allow images from Google (profile pictures)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  
  // Proxy API requests to the backend during development
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: '/seller/:path*',
        destination: `${apiUrl}/seller/:path*`,
      },
      {
        source: '/callbacks/:path*',
        destination: `${apiUrl}/callbacks/:path*`,
      },
    ];
  },
};

export default nextConfig;
