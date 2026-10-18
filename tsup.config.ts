import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", element: "src/element.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    target: "es2020",
  },
  {
    entry: { react: "src/react.tsx" },
    format: ["esm", "cjs"],
    dts: true,
    external: ["react"],
    target: "es2020",
    banner: { js: '"use client";' },
  },
  {
    // <script src=".../scroll-frames.global.js"> — registers <scroll-frames> and exposes window.ScrollFrames
    entry: { "scroll-frames": "src/global.ts" },
    format: ["iife"],
    globalName: "ScrollFrames",
    minify: true,
    target: "es2019",
    outExtension: () => ({ js: ".global.js" }),
  },
]);
