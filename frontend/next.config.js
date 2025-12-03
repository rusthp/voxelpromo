/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations for development
  swcMinify: true,

  // Disable font optimization in dev for faster startup
  optimizeFonts: false,

  // Experimental features for better performance
  experimental: {
    // Faster refresh
    optimizeCss: false,
    // Reduce memory usage
    workerThreads: false,
    cpus: 1
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  }
}

module.exports = nextConfig
