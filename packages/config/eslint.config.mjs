import { createEslintConfig } from "./src/eslint.ts";

export default createEslintConfig({
  // config.test.ts intentionally tests physical direction class strings
  ignores: ["src/**/*.test.ts"],
});
