import path from 'path';
// In ESM config files, __dirname is not defined; use process.cwd() instead.
const projectRoot = process.cwd();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sharp'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {},
  webpack: (config, { isServer }) => {
    // Alias the optional 'canvas' dependency used by pdfjs-dist's NodeCanvasFactory
    // to a lightweight browser stub so that Next.js won't try to resolve the native module.
    // This prevents "Module not found: Can't resolve 'canvas'" build errors when bundling
    // client components that import pdfjs-dist.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: path.resolve(projectRoot, 'src/stubs/canvas.ts'),
    };

    return config;
  },
};

export default nextConfig;