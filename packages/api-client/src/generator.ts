/**
 * Deterministic OpenAPI client source generator for `@managevent/api-client`.
 */
import type { OpenApiSpecDocument } from "@managevent/api/openapi";

export interface ExtractedOperation {
  method: string;
  path: string;
  summary: string;
  tags: string[];
}

/**
 * Extracts all HTTP operations from an OpenAPI 3.1 document in deterministic sorted order.
 */
export function extractOpenApiOperations(spec: OpenApiSpecDocument): ExtractedOperation[] {
  const operations: ExtractedOperation[] = [];
  const sortedPaths = Object.keys(spec.paths).sort();

  for (const path of sortedPaths) {
    const pathItem = spec.paths[path] ?? {};
    const methods = Object.keys(pathItem).sort();
    for (const method of methods) {
      const op = pathItem[method] as { summary?: string; tags?: string[] } | undefined;
      if (op && typeof op === "object") {
        operations.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary ?? "",
          tags: op.tags ?? [],
        });
      }
    }
  }

  return operations;
}

/**
 * Generates the exact Prettier-formatted TypeScript source for `src/generated.ts` from `apps/api`'s OpenAPI document.
 */
export function buildGeneratedClientSource(spec: OpenApiSpecDocument): string {
  const operations = extractOpenApiOperations(spec);
  const itemsSource = operations
    .map(
      (op) => `  {
    method: ${JSON.stringify(op.method)},
    path: ${JSON.stringify(op.path)},
    summary: ${JSON.stringify(op.summary)},
    tags: [${op.tags.map((t) => JSON.stringify(t)).join(", ")}],
  },`,
    )
    .join("\n");

  return `// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.
// Run \`pnpm --filter @managevent/api-client generate\` to regenerate from @managevent/api OpenAPI spec.

export const GENERATED_API_VERSION = ${JSON.stringify(spec.info.version)} as const;

export const GENERATED_OPERATIONS = [
${itemsSource}
] as const;

export type GeneratedOperation = (typeof GENERATED_OPERATIONS)[number];
`;
}
