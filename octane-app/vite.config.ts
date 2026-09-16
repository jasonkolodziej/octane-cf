import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { octane } from "@octanejs/vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    octane({ requireDirective: true }),
    react(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { target: "esnext" },
});
