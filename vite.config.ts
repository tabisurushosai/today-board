/// <reference types="node" />

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const extensionOutputAssets = [
  "manifest.json",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
] as const;

function verifyExtensionOutputAssets(): Plugin {
  let distDir = "dist";

  return {
    name: "verify-extension-output-assets",
    configResolved(config) {
      distDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const missingAssets = extensionOutputAssets.filter(
        (assetPath) => !existsSync(resolve(distDir, assetPath)),
      );

      if (missingAssets.length > 0) {
        this.error(
          `Missing Chrome extension assets in ${distDir}: ${missingAssets.join(", ")}`,
        );
      }
    },
  };
}

export default defineConfig({
  publicDir: "public",
  plugins: [verifyExtensionOutputAssets()],
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
