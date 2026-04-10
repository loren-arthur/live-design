import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { liveDesign } from "@live-design/vite-plugin";

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [react(), liveDesign()],
});
