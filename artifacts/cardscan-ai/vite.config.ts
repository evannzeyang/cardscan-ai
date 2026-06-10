import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(({ mode }) => {
  const currentDir = process.cwd();
  const envDir = path.resolve(currentDir);
  const env = loadEnv(mode, envDir, "");

  // Safe fallback for local development port
  const rawPort = env.PORT ?? process.env.PORT ?? "5173";
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // Safe fallback for local development base path
  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay()
    ],
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "src"),
        "@assets": path.resolve(currentDir, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(currentDir),
    build: {
      outDir: path.resolve(currentDir, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: mode === "production" 
            ? "https://cardscan-ai.onrender.com" 
            : "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});