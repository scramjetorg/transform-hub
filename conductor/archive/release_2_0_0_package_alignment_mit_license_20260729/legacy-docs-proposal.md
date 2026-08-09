# Legacy Documentation Cleanup Proposal

_Prepared 2026-07-30 from read-only repository evidence. No files have been
moved, deleted, or rewritten by this proposal._

## Proposed dispositions

| Material | Proposed disposition | Traceability / safety condition |
| --- | --- | --- |
| Completed roadmap items 013 (worker isolation), 014 (Python wrapper), 015 (Bun wrapper) | Mark/retain completion evidence, then archive only after reviewer approval. | Preserve the item and an archive index/link; confirm 015 status from code before changing it. |
| Actionable roadmap items 003–007, 009–012, 016–018 | Retain as an actionable backlog, preferably consolidate/index rather than delete. | Their implementation gaps remain evidenced; do not discard work requests. |
| Item 001 and output `read-more/agentic-usage.md` | Retain output; archive redundant proposal only if output currency is confirmed. | The output is user-facing and must remain linked. |
| Items 002, 005, 008 | Retain in place. | They are partial or require further verification. |
| `guides/kubernetes/`, `guides/nomad/` | Archive, not delete. | Preserve old deployment references and add an index/redirect to current adapter docs. |
| `api.md`, runner-wrapper architecture, legacy read-more documents | Retain with an historical-context notice or current-doc cross-reference. | They retain API/architecture value. |
| Technical debt register, issue/PR templates, v1 sidebar | Retain. | Technical debt and v1 support remain active; ClickUp template wording needs a separate workflow decision. |

## Explicit non-actions

- Do not delete any feature request or legacy guide.
- Do not alter active Conductor tracks or registry entries.
- Do not rewrite the PR template without confirming the project issue/PR workflow.
- Do not treat the Node 22 WASM issue as complete without targeted evidence.

## Required safety review

Before any non-Conductor documentation move or archive, review the proposed
archive destinations, links/redirects, and retained backlog index. Before any
Conductor record movement, obtain a separate reviewer safety result and keep
active registry links unchanged.
