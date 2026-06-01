# Product Guidelines

## Purpose

These guidelines define how Scramjet Transform Hub should communicate, behave, and evolve as a product. They apply to documentation, CLI/API user experience, examples, product-facing decisions, and contributor-visible workflows.

## Prose Style

Use clear technical language.

- Prefer precise statements over marketing language.
- Explain what the system does, where it runs, and what guarantees users can expect.
- Name concrete concepts consistently: Transform Sequence, Hub, Adapter, Runner, Runtime Wrapper, CLI, API, AppContext.
- When describing behavior, include relevant scope: process, Docker, Kubernetes, Node.js, Python, Bun, or future runtimes.
- Avoid vague terms such as “magic,” “simple” without context, or “just works” unless the mechanism is also explained.

## Brand Tone

Use an open-source helpful and developer-first tone.

- Be welcoming to new contributors without hiding complexity.
- Make contribution paths and extension points discoverable.
- Favor examples that help developers complete real tasks.
- Acknowledge constraints, platform requirements, and runtime-specific limitations directly.
- Treat operational reliability as part of developer experience.

## Documentation Principles

- Start with the user goal, then show the command, API, or file involved.
- Keep conceptual pages aligned with source code entrypoints and package responsibilities.
- Include prerequisites for commands that require built packages, Docker, Kubernetes, Python, or downloaded reference apps.
- Prefer minimal runnable examples over broad conceptual descriptions.
- For brownfield behavior, document what exists before proposing future changes.

## CLI/API UX Principles

### Predictable Defaults

Defaults should be safe, documented, and consistent across supported adapters wherever possible.

- State which adapter, runtime, image, or config value is used by default.
- Avoid hidden fallbacks that change execution semantics without clear user feedback.
- Keep command behavior stable across local development and built `dist/` execution.
- If behavior differs by adapter, make that difference explicit in help text, docs, or errors.

## Consistency Rules

### Docs-Code Alignment

Documentation, CLI help, examples, configuration, and implementation should describe the same behavior.

- Update docs when changing runtime selection, adapter behavior, config fields, or CLI options.
- Keep generated docs and package-level documentation consistent with source package responsibilities.
- Do not document unsupported runtime behavior as available.
- Prefer linking to canonical entrypoints rather than duplicating stale implementation details.

## Product Decision Guidelines

When choosing between product changes:

1. Preserve reliable sequence execution and lifecycle control.
2. Prefer changes that reduce ambiguity for developers and operators.
3. Keep current adapter and runtime behavior compatible unless a breaking change is intentional and documented.
4. Make new runtime or adapter behavior observable and testable.
5. Avoid feature work that increases operational complexity without improving developer or platform outcomes.

## Quality Bar

A product-facing change is ready when:

- The intended user and workflow are clear.
- Defaults and configuration behavior are documented.
- Errors or failure modes are actionable where user-facing.
- Docs and code agree.
- The change supports the product goal of a stable open-source runtime supervisor.
