# Proposal: Document Agentic Usage and AI-Driven Sequence Development

| Field | Value |
|-------|-------|
| Title | Document agentic usage and AI-driven Sequence development |
| Category | docs |
| Scope | docs/, docs/read-more/, README.md |
| Breaking | no |

## Problem Statement

The current documentation assumes a human developer is reading every page, installing tools manually, and running commands by hand. There is no guidance for agentic workflows, automated environment setup, or AI-assisted Sequence authoring.

## Current Behavior

- README and guides describe manual `npm install`, `npm run build:all`, and `si` CLI usage.
- No section explains how an automated agent should bootstrap STH, verify readiness, or interact with the API.
- Sequence templates are described for human copy-paste, not for programmatic generation.

## Expected Behavior

- A dedicated guide or section that explains how an agent can start STH, deploy Sequences, and consume streams without human interaction.
- Clear contracts for readiness probes, health endpoints, and stable naming so agents can reason about instance lifecycle.
- Examples of programmatic Sequence generation and deployment via the REST API or TypeScript client.

## Proposed Change

1. Add `docs/read-more/agentic-usage.md` covering:
   - Headless bootstrap with `--runtime-adapter process` and `--startup-config`.
   - Health and readiness endpoints an agent should poll.
   - How to map `sequenceName` / `instanceName` to stable identifiers for idempotent deployments.
   - REST API patterns for send, start, output, and event streaming.
   - A minimal TypeScript example using `@scramjet/api-client` inside an agent loop.
2. Update `README.md` with a short "Agentic usage" link.

## Backwards Compatibility

No breaking changes. Pure documentation addition.

## Testing Plan

- Review the new guide by running every command verbatim in a clean environment.
- Verify the TypeScript client example compiles and executes against a local STH.

## References

- `docs/read-more/sth-config.md`
- `docs/read-more/how-to-write-a-sequence.md`
- `@scramjet/api-client` package
