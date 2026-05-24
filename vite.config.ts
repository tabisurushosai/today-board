import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  build: {
    copyPublicDir: true,
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        app: "index.html",
      },
    },
  },
});
