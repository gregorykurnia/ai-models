import assert from "node:assert/strict";
import { test } from "node:test";
import "next/dist/server/node-environment.js";
import { getRedirectUrl, unstable_getResponseFromNextConfig } from "next/experimental/testing/server.js";
import nextConfig from "../next.config";

test("the old Terminal-Bench URL permanently redirects and retains a shared model query", async () => {
  const base = "https://example.test/leaderboards";
  const query = "?q=Kimi%20K3.1%20Pro";
  const response = await unstable_getResponseFromNextConfig({ nextConfig, url: `${base}/terminal-bench-4-0${query}` });
  assert.equal(response.status, 308);
  const destination = new URL(getRedirectUrl(response)!);
  assert.equal(`${destination.origin}${destination.pathname}`, `${base}/terminal-bench-4-1`);
  assert.equal(destination.searchParams.get("q"), "Kimi K3.1 Pro");
});
