import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Machine partagée avec les suites e2e backend : le défaut de 5 s
    // fait échouer des rendus triviaux sous contention CPU.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
