/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Rewrites don't work with static export — API calls go direct to NEXT_PUBLIC_API_URL
};

module.exports = nextConfig;
