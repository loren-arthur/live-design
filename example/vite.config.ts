import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { liveDesign } from "@live-design/vite-plugin";

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    liveDesign({
      author: "Designer",
      themeVariables: [
        "--brand-primary",
        "--brand-primary-hover",
        "--brand-secondary",
        "--brand-bg",
        "--brand-bg-alt",
        "--brand-text",
        "--brand-text-muted",
        "--brand-border",
        "--brand-radius",
        "--brand-font",
      ],
    }),
  ],
});
