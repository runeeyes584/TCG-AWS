import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same alias as tsconfig, so tests can import the game engine the way the front end does.
    alias: { "@backend": fileURLToPath(new URL("./Back-end/src", import.meta.url)) }
  },
  test: {
    globals: true,
    environment: "node"
  }
});
