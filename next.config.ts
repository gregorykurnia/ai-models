import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  async rewrites() {
    return {
      fallback: [
        // The planner loads the requested task in the browser using the original URL.
        { source: "/suitability/:taskId", destination: "/suitability" },
      ],
    };
  },
};

export default config;
