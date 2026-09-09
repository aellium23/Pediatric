/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint is run as a dedicated CI step; keep build focused on type-checking.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
