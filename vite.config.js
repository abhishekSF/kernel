import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { localFirst } from "./tooling/local-first.js";

export default defineConfig({
  // Relative asset paths, so dist/ works from any folder or sub-path.
  base: "./",
  plugins: [react(), tailwindcss(), localFirst()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "extension/**/*.{test,spec}.{js,ts}",
      "tooling/**/*.{test,spec}.js",
    ],
  },
});
