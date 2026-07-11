import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    environmentOptions: {
      jsdom: { url: "https://app.example.com" },
    },
    // This machine has 4 logical CPUs. convex-test's esbuild bundling and
    // jsdom's cold environment setup are both CPU-heavy; forking a worker
    // per test file (12 files) starves them of cores, which manifested as
    // spurious stripeWebhook test timeouts and the embed.test.ts jsdom
    // worker failing to start in time. Capping concurrent forks keeps each
    // worker enough headroom to finish setup within the default timeouts.
    maxForks: 2,
    testTimeout: 20000,
  },
});
