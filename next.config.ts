import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isGitHubPages ? "/mockingbird" : "",
  assetPrefix: isGitHubPages ? "/mockingbird/" : "",
};

export default nextConfig;
