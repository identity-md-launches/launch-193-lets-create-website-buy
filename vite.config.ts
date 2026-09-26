import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react") ||
            id.includes("/node_modules/scheduler/")
          )
            return "react";
          if (id.includes("/node_modules/")) return "ethereum";
        },
      },
    },
  },
});
