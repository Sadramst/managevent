import { createEslintConfig } from "@managevent/config/eslint";

export default createEslintConfig({ ignores: [".next/**", "next-env.d.ts"] });
