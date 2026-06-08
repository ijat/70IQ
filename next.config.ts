import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Advertise the agent protocol on every response so crawlers/agents can
        // discover how to take the test without reading the page.
        source: "/:path*",
        headers: [
          { key: "Link", value: '</llms.txt>; rel="llms"' },
          { key: "X-LLM-Instructions", value: "See /llms.txt: POST /api/iq/start then loop /api/iq/answer" },
        ],
      },
    ];
  },
};

export default nextConfig;
