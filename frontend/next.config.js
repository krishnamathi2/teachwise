const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export for web deployment
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Only apply these configurations for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        // Handle node: protocol imports
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': require.resolve('crypto-browserify'),
        'node:stream': require.resolve('stream-browserify'),
        'node:buffer': require.resolve('buffer'),
        'node:util': false,
        'node:url': false,
        'node:process': false,
      }
      
      // Add alias for node: protocol
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': require.resolve('crypto-browserify'),
        'node:stream': require.resolve('stream-browserify'),
        'node:buffer': require.resolve('buffer'),
        'node:util': false,
        'node:url': false,
        'node:process': false,
      }

      // Strip the `node:` protocol prefix so fallbacks work as expected
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        })
      )
    }
    return config
  },
}

module.exports = nextConfig