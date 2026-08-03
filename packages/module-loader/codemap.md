# packages/module-loader/

## Responsibility

Provides a simple runtime module loading utility supporting both `import()` (dynamic ESM import) and `require()` (CommonJS require) modes, with optional memory usage tracking after each module load.

## Design / Patterns

- **Minimal surface**: Single `loadModule(opts)` function exported. Options specify `name` (module path/name), and optional `mode` (`"import"` | `"require"`).
- **Memory diff logging**: Logs heap usage difference before and after module load at `DEBUG` level for diagnostics.
- **Plain JavaScript**: Implemented in `.js` with `.d.ts` types — no TypeScript compilation needed, directly consumable as-is.

## Source Files

| File | Lines | Role |
|------|-------|------|
| `src/index.js` | 34 | `loadModule` function implementation. |
| `src/index.d.ts` | — | TypeScript type declarations. |

## Integration Points

- Minimal dependencies: only `@scramjet/obj-logger`.
- Used where dynamic module loading is needed at runtime (e.g., plugin or adapter loading).
