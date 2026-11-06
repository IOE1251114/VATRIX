import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

export default defineConfig(({ mode }) => {
  // Vercel's production build must be connected to Supabase. Without these values the site
  // silently falls back to browser-only mode (progress saved in each browser) and the build
  // includes the answer key — so stop the deployment with a clear message instead.
  if (process.env.VERCEL_ENV === "production") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const missing = REQUIRED.filter((k) => !env[k]?.trim());
    if (missing.length)
      throw new Error(
        `Missing ${missing.join(" and ")} for this production build. In Vercel open ` +
          `Settings → Environment Variables, add them for the Production environment ` +
          `(see README → "Connect the deployed site"), then redeploy.`,
      );
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // Keep large third-party libraries in their own cacheable chunks.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
          },
        },
      },
    },
  };
});
