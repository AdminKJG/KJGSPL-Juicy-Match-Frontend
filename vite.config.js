import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_TARGET || env.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 4000,
      open: false,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, "/v1"),
        },
      },
    },
  };
});
