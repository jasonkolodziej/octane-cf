import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { octane } from "@octanejs/vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [
    octane({ requireDirective: true }),
    react(),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  build: { target: "esnext" },
});
