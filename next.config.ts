import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot:process.cwd(),
  async headers() { return [{source:"/:path*",headers:[{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"}]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]}]; },
  turbopack: {
    root:process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
