import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// ESLint tanpa eslint-config-next: plugin Next membawa dependensi lama (braces) yang punya CVE.
// Aturan penting tetap ada: TypeScript, rules of hooks, dan exhaustive-deps.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts", "*.config.js", "*.config.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  }
);
