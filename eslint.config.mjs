// Perfil leve do Next (Vibe Coding Toolkit): presets oficiais + regras em eslint-rules/.
// Regras novas com violações antigas entram como aviso; a contagem e o plano de
// redução ficam em docs/quality.md. Sem violação = erro.
import { defineConfig } from "eslint/config";
import base from "./eslint-rules/next-base.mjs";

export default defineConfig([
  ...base,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    rules: { "quality/max-lines": ["warn", { max: 350 }] },
  },
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  {
    ignores: ["marketing/**", "scripts/verify-quality-rules.mjs"],
  },
]);
