# ADR-0010: Pin TypeScript 5.9

- **Status:** Accepted. The root pins `typescript` at `5.9.3`.

- **Context:** TypeScript 7 (the native Go compiler) is out, but not every framework tool in this stack (Next.js, Expo, the ESLint TypeScript plugins) may support it yet.
- **Decision:** Pin `typescript@~5.9` at the root. Re-evaluate once Next.js, Expo and typescript-eslint document support for TS 7.
