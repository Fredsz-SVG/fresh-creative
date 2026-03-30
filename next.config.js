/** @type {import('next').NextConfig} */
const honoApiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')

const nextConfig = {
  async rewrites() {
    // Same-origin /api/* → Hono (browser tidak perlu langsung ke :8787; kurangi CORS & "Failed to fetch").
    // fallback: jalankan setelah route Next milik app (mis. app/api/audio) dicek.
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${honoApiBase}/api/:path*`,
        },
      ],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      }
    ],
  },
}

module.exports = nextConfig

