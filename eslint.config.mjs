import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // The app intentionally resets dialog/filter state from props inside
      // effects as part of Next.js dialog open/close flows. That lifecycle is
      // the documented escape hatch for sync-with-props and is expected here;
      // we keep the strict dependency rule on for genuinely missing deps.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
