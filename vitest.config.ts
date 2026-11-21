import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Reusa la config de Vite (plugin de Vue, alias @/) y le suma lo de los tests.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.spec.ts"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      // Las fechas de los tests se calculan en hora de Argentina, como la usan los usuarios.
      env: { TZ: "America/Argentina/Buenos_Aires" },
      restoreMocks: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,vue}"],
        exclude: ["src/**/*.spec.ts", "src/**/*.d.ts"],
        reporter: ["text", "html"],
      },
    },
  })
);
