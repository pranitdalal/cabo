/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cabo/shared'],
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  },
}

export default nextConfig
