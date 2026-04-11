/** @type {import('next').NextConfig} */
const honoApiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')

const nextConfig = {
  compress: true,
  // Required for styled-components v6 + @scaleflex/ui (react-filerobot-image-editor) so theme/CSS applies correctly.
  compiler: {
    styledComponents: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
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

