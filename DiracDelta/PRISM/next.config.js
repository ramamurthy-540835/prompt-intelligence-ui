/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};
module.exports = nextConfig;
