/**
 * ESLint flat configuration and Managevent custom rules.
 *
 * Includes the `managevent/no-physical-direction-classes` rule which blocks
 * physical CSS direction utility classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`,
 * `right-`, `text-left`, `text-right`) in favour of logical CSS properties
 * (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`).
 */
import tseslint from "typescript-eslint";

/**
 * Regex matching physical-direction Tailwind utility tokens inside a whitespace-delimited class list.
 */
export const FORBIDDEN_PHYSICAL_CLASS_TOKEN_REGEX =
  /^(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|left|right)-[a-z0-9.[\]/%-]+$|^(?:[a-z0-9-]+:)*text-(?:left|right)$/;

/**
 * Suggestions mapping physical prefixes to logical equivalents.
 */
export const LOGICAL_CLASS_SUGGESTIONS: Readonly<Record<string, string>> = {
  [["m", "l-"].join("")]: "ms-",
  [["m", "r-"].join("")]: "me-",
  [["p", "l-"].join("")]: "ps-",
  [["p", "r-"].join("")]: "pe-",
  [["le", "ft-"].join("")]: "start-",
  [["ri", "ght-"].join("")]: "end-",
  [["text", "left"].join("-")]: "text-start",
  [["text", "right"].join("-")]: "text-end",
};

/**
 * Finds all forbidden physical-direction Tailwind classes in a string.
 *
 * @param input - A className string or literal text to inspect.
 * @returns Array of offending physical class tokens found in `input`.
 */
export function findPhysicalDirectionClasses(input: string): string[] {
  const tokens = input
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return tokens.filter((token) => FORBIDDEN_PHYSICAL_CLASS_TOKEN_REGEX.test(token));
}

/**
 * Minimal AST node interface used by our custom ESLint rule without requiring `@types/estree`.
 */
export interface EslintAstNode {
  type: string;
  value?: unknown;
  quasis?: Array<{ value: { raw: string; cooked?: string | null } }>;
}

/**
 * Minimal ESLint RuleContext interface.
 */
export interface EslintRuleContext {
  report(descriptor: {
    node: EslintAstNode;
    messageId: string;
    data?: Record<string, string>;
  }): void;
}

/**
 * Custom ESLint rule that blocks physical CSS direction utility classes.
 */
export const noPhysicalDirectionClassesRule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow physical direction CSS utility classes. Use logical properties (ms-, me-, ps-, pe-, start-, end-, text-start, text-end) instead.",
    },
    messages: {
      noPhysicalClass:
        "Physical direction class '{{className}}' is forbidden for RTL compatibility. Use logical properties (ms-, me-, ps-, pe-, start-, end-, text-start, text-end).",
    },
    schema: [],
  },
  create(context: EslintRuleContext) {
    function checkText(node: EslintAstNode, text: string): void {
      const violations = findPhysicalDirectionClasses(text);
      for (const className of violations) {
        context.report({
          node,
          messageId: "noPhysicalClass",
          data: { className },
        });
      }
    }

    return {
      Literal(node: EslintAstNode) {
        if (typeof node.value === "string") {
          checkText(node, node.value);
        }
      },
      TemplateLiteral(node: EslintAstNode) {
        if (Array.isArray(node.quasis)) {
          for (const quasi of node.quasis) {
            const text = quasi.value.cooked ?? quasi.value.raw;
            checkText(node, text);
          }
        }
      },
    };
  },
};

/**
 * Managevent ESLint plugin containing custom rules.
 */
export const manageventEslintPlugin = {
  rules: {
    "no-physical-direction-classes": noPhysicalDirectionClassesRule,
  },
};

/**
 * Options for creating a workspace ESLint flat config.
 */
export interface CreateEslintConfigOptions {
  /** Additional file globs to ignore. */
  ignores?: string[];
  /** Whether to enable the physical-direction class rule (default: true). */
  enforceLogicalDirection?: boolean;
}

/**
 * Creates a flat ESLint configuration object array for Managevent workspaces.
 *
 * @param options - Optional overrides for ignores and rule toggles.
 * @returns Flat config items.
 */
export function createEslintConfig(options: CreateEslintConfigOptions = {}) {
  const { ignores = [], enforceLogicalDirection = true } = options;

  return [
    {
      ignores: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.d.ts",
        ...ignores,
      ],
    },
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.mjs"],
      languageOptions: {
        parser: tseslint.parser,
      },
      plugins: {
        "@typescript-eslint": tseslint.plugin,
        managevent: manageventEslintPlugin,
      },
      rules: {
        ...(enforceLogicalDirection
          ? { "managevent/no-physical-direction-classes": "error" as const }
          : {}),
        "@typescript-eslint/no-explicit-any": "error" as const,
        "no-unused-vars": "off" as const,
        "prefer-const": "error" as const,
        eqeqeq: ["error" as const, "always"],
      },
    },
  ];
}
