/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  experimental: {
    appDir: false
  },
  distDir: '.next',
  // Point to the source directory
  basePath: '',
}

export default nextConfig 