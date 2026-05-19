import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./tests/global-setup.js"],
    include: ["tests/**/*.test.js"],
    testTimeout: 10000,
    hookTimeout: 30000, // cleanAllTables() TRUNCATE CASCADE can be slow on cold Neon connections
    fileParallelism: false,
  },
})
