/*! Open Historia Map Editor © 2026 Nicholas Krol, MIT (see src/Editor/LICENSE). */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  // In `npm run dev`, proxy the API and the vendored FMG to the Express server so
  // save/load, the basemap library and the Generate console work with hot-reload.
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/fmg": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-ol": ["ol"],
        },
      },
    },
  },
});
