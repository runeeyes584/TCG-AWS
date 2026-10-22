import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Synthesising a stack takes a few seconds.
    testTimeout: 60_000
  }
});
