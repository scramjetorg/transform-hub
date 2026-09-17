# Requirements

| ID | State | Kind | Requirement | Decision evidence |
| --- | --- | --- | --- | --- |
| R-SCRIPTS-001 | active | constraint | Root-level executable scripts must live under `scripts/`; callers must be updated to the moved paths. Package-local scripts, configuration files, and GitHub workflows are excluded. | User confirmed “root-level executable scripts only” on 2026-09-17. |
