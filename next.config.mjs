/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  assetPrefix: './',
  trailingSlash: true,
  // --- ADD THIS BLOCK ---
  // This disables the Image Optimization API, which can cause issues in static exports for Electron.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;