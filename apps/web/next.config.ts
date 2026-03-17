import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@genyra/shared-types'],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
