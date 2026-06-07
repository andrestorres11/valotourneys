/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'media.valorant-api.com' },
      { protocol: 'https', hostname: '**.henrikdev.xyz' },
    ],
  },
}

module.exports = nextConfig
