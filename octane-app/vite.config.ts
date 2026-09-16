import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { octane } from "@octanejs/vite-plugin";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [
    octane({ requireDirective: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": srcDir,
    },
    dedupe: ["octane", "react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["octane"],
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1500,
  },
});
