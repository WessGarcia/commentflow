// Checagem de promessas com tipos (Vibe Coding Toolkit); roda à parte com `npm run lint:typed`.
// Começa como aviso por causa das violações antigas (contagem em docs/quality.md).
import defaultConfig from "./eslint.config.mjs";

const config = [
  ...defaultConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
    },
  },
];

export default config;
