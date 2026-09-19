# Requirements

| ID | State | Kind | Requirement | Decision evidence |
| --- | --- | --- | --- | --- |
| R-SCRIPTS-001 | active | constraint | Root-level executable scripts must live under `scripts/`; callers must be updated to the moved paths. Package-local scripts, configuration files, and GitHub workflows are excluded. | User confirmed “root-level executable scripts only” on 2026-09-17. |
| R-WORKFLOW-001 | active | constraint | Workflow and workflow-step names must describe their operational purpose and must not use planning-phase labels such as `Phase 4`. | User-directed on 2026-09-17. |
| R-BDD-OBS-001 | active | outcome | BDD explicitly enables runner-log forwarding and, on scenario failure only, prints a bounded, redacted runner/host lifecycle trace sufficient to diagnose the failure. | User-directed on 2026-09-17. |
