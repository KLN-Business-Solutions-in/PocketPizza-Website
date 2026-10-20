import { bindings, defineConfig, defineWorker } from "cf/config";

// Baked in at build time: set API_ORIGIN when building for production, e.g.
// API_ORIGIN=https://pokket-pizza-api.<subdomain>.workers.dev npm run deploy:vinext
const apiOrigin = process.env.API_ORIGIN || "http://localhost:4000";

export default defineConfig({
  worker: defineWorker({
    name: "pokket-pizza-web",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-10-20",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      API_ORIGIN: bindings.text(apiOrigin),
      API: bindings.worker({ worker: "pokket-pizza-api" }),
    },
  }),
});
