// Bundles tools/exportContent.ts for Node so it can be executed directly.
// Separate from vite.config.ts so the app build is untouched.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: process.env.EXPORT_ENTRY || "tools/exportContent.ts",
    outDir: '.export-build',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
  },
});
