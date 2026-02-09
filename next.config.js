const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config, { isServer }) => {
    // Fix untuk face-api.js yang mencoba menggunakan Node.js modules di browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      }

      // Ignore encoding module dari node-fetch di dalam face-api.js
      config.plugins = config.plugins || []

      // Ignore encoding module secara spesifik dari node-fetch
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource, context) {
            // Ignore encoding module dari node-fetch
            if (resource === 'encoding' && context.includes('node-fetch')) {
              return true
            }
            return false
          },
        })
      )
    }
    return config
  },
}

module.exports = nextConfig
