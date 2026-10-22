import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same alias as tsconfig, so tests can import the game engine the way the front end does.
    alias: { "@backend": fileURLToPath(new URL("./Back-end/src", import.meta.url)) }
  },
  test: {
    globals: true,
    environment: "node",
    // The CDK app has its own dependencies and tests (cd cdk && npm test).
    exclude: ["**/node_modules/**", "**/dist/**", "cdk/**"]
  }
});
