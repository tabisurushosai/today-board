/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const requiredExtensionIconSizes = ["16", "48", "128"] as const;

type RequiredExtensionIconSize = (typeof requiredExtensionIconSizes)[number];

type ExtensionManifest = {
  icons?: Partial<Record<RequiredExtensionIconSize, string>>;
};

function verifyExtensionOutputAssets(): Plugin {
  let distDir = "dist";

  return {
    name: "verify-extension-output-assets",
    configResolved(config) {
      distDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const manifestPath = resolve(distDir, "manifest.json");
      if (!existsSync(manifestPath)) {
        this.error(`Missing Chrome extension manifest in ${distDir}: manifest.json`);
      }

      let manifest: ExtensionManifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ExtensionManifest;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`Invalid Chrome extension manifest in ${distDir}: ${message}`);
      }

      const missingIconDefinitions = requiredExtensionIconSizes.filter(
        (size) => typeof manifest.icons?.[size] !== "string" || manifest.icons[size] === "",
      );
      if (missingIconDefinitions.length > 0) {
        this.error(
          `Missing Chrome extension icon definitions in manifest.json: ${missingIconDefinitions.join(", ")}`,
        );
      }

      const missingIconFiles = requiredExtensionIconSizes.flatMap((size) => {
        const iconPath = manifest.icons?.[size];
        return iconPath !== undefined && !existsSync(resolve(distDir, iconPath)) ? [iconPath] : [];
      });
      if (missingIconFiles.length > 0) {
        this.error(
          `Missing Chrome extension icon files in ${distDir}: ${missingIconFiles.join(", ")}`,
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
