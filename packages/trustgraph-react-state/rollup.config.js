import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@trustgraph/client",
    "@trustgraph/react-provider",
    "@tanstack/react-query",
    "zustand",
    "uuid",
    "compute-cosine-similarity",
  ],
  plugins: [
    resolve({
      // Don't resolve symlinked packages - treat them as external
      // This prevents rollup from trying to bundle npm linked dependencies
      resolveOnly: [/^(?!@trustgraph)/],
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "./dist",
      rootDir: "./src",
    }),
  ],
};
