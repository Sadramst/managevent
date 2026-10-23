/**
 * @managevent/config
 *
 * Shared tooling presets (ESLint flat config, Prettier, Vitest, Tailwind v4 tokens)
 * and PII log redaction utilities.
 */

export {
  createEslintConfig,
  type CreateEslintConfigOptions,
  type EslintAstNode,
  type EslintRuleContext,
  findPhysicalDirectionClasses,
  FORBIDDEN_PHYSICAL_CLASS_TOKEN_REGEX,
  LOGICAL_CLASS_SUGGESTIONS,
  manageventEslintPlugin,
  noPhysicalDirectionClassesRule,
} from "./eslint.js";

export { prettierConfig, type PrettierConfig } from "./prettier.js";

export {
  isSensitiveKey,
  REDACTED_FIELD_NAMES,
  REDACTED_PLACEHOLDER,
  redactForLog,
  redactUrl,
} from "./redact.js";

export {
  type BrandColorTokens,
  generateTailwindV4ThemeCss,
  tailwindBrandTokens,
} from "./tailwind.js";

export { baseVitestConfig, createVitestConfig, type VitestPresetOptions } from "./vitest.js";
