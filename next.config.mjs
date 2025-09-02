/** @type {import('next').NextConfig} */

// Check if the environment is production (this is set automatically by the 'next build' command)
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  // UPDATED: Use a relative path ('./') for the packaged app, but not for the dev server
  assetPrefix: isProd ? './' : undefined,
  trailingSlash: true,
  // This disables the Image Optimization API, which is correct for Electron
  images: {
    unoptimized: true,
  },
};  

export default nextConfig;