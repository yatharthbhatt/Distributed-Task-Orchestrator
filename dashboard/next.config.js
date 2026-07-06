const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output keeps the production Docker image small.
  output: "standalone",
  // Pin the file-tracing root to this app so the standalone build is correct
  // even when other lockfiles exist higher up the tree.
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
