import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-ui": ["lucide-react", "sonner", "clsx"],
          "vendor-http": ["axios"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
});
