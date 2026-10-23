/**
 * Shared Vitest preset configuration for Managevent workspaces.
 */
export interface VitestPresetOptions {
  /** Test environment (`node` by default). */
  environment?: "node" | "jsdom" | "happy-dom";
  /** Include globs for test files. */
  include?: string[];
  /** Exclude globs for test files. */
  exclude?: string[];
  /** Coverage thresholds (0-100). */
  coverageThresholds?: {
    lines?: number;
    functions?: number;
    branches?: number;
    statements?: number;
  };
}

/**
 * Creates a standardized Vitest configuration object.
 *
 * @param options - Optional overrides for environment, test globs, and coverage thresholds.
 * @returns Vitest configuration object.
 */
export function createVitestConfig(options: VitestPresetOptions = {}) {
  const {
    environment = "node",
    include = ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude = ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverageThresholds,
  } = options;

  return {
    test: {
      globals: false,
      environment,
      include,
      exclude,
      passWithNoTests: false,
      coverage: {
        provider: "v8" as const,
        reporter: ["text", "json-summary"],
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/index.ts"],
        ...(coverageThresholds ? { thresholds: coverageThresholds } : {}),
      },
    },
  };
}

/**
 * Default Vitest preset for Node packages.
 */
export const baseVitestConfig = createVitestConfig();
