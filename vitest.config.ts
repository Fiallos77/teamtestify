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
    // per test file starves them of cores, which manifested as spurious
    // stripeWebhook test timeouts and the embed.test.ts jsdom worker failing
    // to start in time. Capping concurrent workers keeps each one enough
    // headroom to finish setup within the timeouts. (Vitest 4's option is
    // maxWorkers; the default pool is 'forks'.)
    maxWorkers: 2,
    testTimeout: 20000,
  },
});
