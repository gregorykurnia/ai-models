import type { NextConfig } from "next";
import { terminalBenchRedirect } from "./src/lib/leaderboard-redirects";

const config: NextConfig = {
  agentRules: false,
  async redirects() {
    return [{
      source: `/leaderboards/${terminalBenchRedirect.from}`,
      destination: `/leaderboards/${terminalBenchRedirect.to}`,
      permanent: true,
    }];
  },
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
