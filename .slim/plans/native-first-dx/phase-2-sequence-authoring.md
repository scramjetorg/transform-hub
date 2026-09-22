# Phase 2 — Sequence authoring

## Goal

Give new sequence authors deterministic Node, Python, and Bun project starts that use the existing deployment protocol.

## Owned paths

- `packages/cli/src/{bin/**,lib/commands/{init.ts,sequence.ts},lib/helpers/sequence.ts}`, `packages/cli/test/**`
- `templates/sequences/{node,python,bun}/**`, `docs-source/examples/{node,python,bun}/**`, and matching focused BDD fixtures/tests

## Tasks

- [ ] Add repository-owned static Node, Python, and Bun sequence templates with one valid engine, entrypoint, packaging metadata, `.siignore`, and minimal local verification.
- [ ] Add `si` scaffold/init and validation helpers that select one runtime and validate entrypoint, engine, package contents, dependency expectations, and ignored required files.
- [ ] Reuse `si sequence pack` and `si sequence deploy`; do not add a competing deployment abstraction.
- [ ] Prove one pack/deploy/run observation for each template through the native path appropriate to its runtime.

## Acceptance criteria

- Each generated project is independently understandable, packable, and deployable through current commands.
- Validation failures identify the missing/invalid field without masking package content errors.
- MVP scope excludes package-manager installation automation and alternate deployment protocols.

## Verification

| Runtime | Topology/prerequisite | Scaffold proof | Command | Expected observation |
|---|---|---|---|---|
| Node | Native Compose proof topology; Node runner image available | `templates/sequences/node` | `npm run test:bdd-ci-node` plus the template's native deploy/run scenario | instance emits its documented output |
| Python | Native Compose proof topology; Python runner image available | `templates/sequences/python` | `npm run test:bdd-ci-python` plus the template's native deploy/run scenario | instance emits its documented output |
| Bun | Native Compose proof topology; `transform-hub-bdd-bun:dev` available | `templates/sequences/bun` | `npm run test:bdd-ci-bun` plus the template's native deploy/run scenario | instance emits its documented output |

Also run focused CLI/template packing tests. Missing mandatory runtime infrastructure blocks phase completion and requires explicit user rescoping; it is not recorded as completed evidence.

## Non-goals

- Replacing package/BDD validation with `@scramjet/sequence-test`, runtime rewrites, or remote template fetching.
