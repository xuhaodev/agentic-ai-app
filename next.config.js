import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Move from experimental.serverComponentsExternalPackages to top-level serverExternalPackages
  serverExternalPackages: ['sharp'],
  eslint: {
    // Disable ESLint during builds (optional)
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Remove serverComponentsExternalPackages from here
  },

  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.canvas = path.resolve(__dirname, 'src/lib/shims/canvas.js');
    return config;
  },
}

export default nextConfig;