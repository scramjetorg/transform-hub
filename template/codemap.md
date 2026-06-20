# @scramjet/template

## Responsibility

A minimal package template/scaffold for creating new Scramjet Transform Hub packages. Provides a standard `package.json` with consistent monorepo scripts (`build`, `clean`, `test`, `test:ava`), basic TypeScript configuration (`tsconfig.json`, `tsconfig.build.json`), and a placeholder source/test layout.

## Design/Patterns

- **Scaffold pattern**: Intended to be copied as a starting point for new packages. The `package.json` includes a `"---remove-next-line"` marker comment indicating lines to remove after copying.
- **Standard toolchain**: Pre-configured with AVA for testing, TypeScript for compilation, and typedoc for documentation generation — matching the monorepo conventions.
- **Private package**: Marked `"private": true` to prevent accidental publication.

## Source Structure

| Path | Role |
|------|------|
| `src/index.ts` | Entry point (empty file to be replaced). |
| `src/lib/` | Library code directory (empty, ready for modules). |
| `test/` | Test directory. |
| `package.json` | Standardized package manifest with monorepo scripts. |
| `tsconfig.json` / `tsconfig.build.json` | TypeScript configuration for development and build. |

## Integration Points

- No runtime dependencies — only dev tooling pre-configured.
- Not published or used at runtime; exists as a developer convenience for bootstrapping new packages.
