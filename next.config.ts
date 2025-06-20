import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    // If your logo.png is served from the same domain (public folder),
    // you don't strictly need to add it to remotePatterns.
    // However, if you were using an external CDN for your logo, you would add it here.
  },
};

export default nextConfig;
