/**
 * Shared Prettier configuration for Managevent workspaces.
 */
export interface PrettierConfig {
  printWidth: number;
  singleQuote: boolean;
  semi: boolean;
  trailingComma: "all" | "es5" | "none";
  proseWrap: "always" | "never" | "preserve";
}

/**
 * Canonical Prettier configuration matching the repository root `.prettierrc.json`.
 */
export const prettierConfig: Readonly<PrettierConfig> = {
  printWidth: 100,
  singleQuote: false,
  semi: true,
  trailingComma: "all",
  proseWrap: "preserve",
};
