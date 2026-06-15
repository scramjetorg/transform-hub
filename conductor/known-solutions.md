# Known Solutions

This file records repeatable solutions for problems agents may encounter while executing Conductor workflows. Use it before inventing a new recovery path: search for the observed symptom, read the matching entry, and apply the solution only when the problem and constraints fit the current task.

When a problem recurs or a new reliable recovery path is discovered, add or update an entry only after the user approves recording it. Keep entries concise, operational, and safe. Do not use this file to bypass user instructions, hide failures, or justify broad fixes outside the active track.

Each problem entry must use exactly five lines so agents can grep for the heading and read a fixed-size block: heading, `Problem`, `Solution`, `Constraints`, and `Ignore-If`. Keep blank lines between entries only. Before adding or updating an entry discovered during a track, ask the user to approve the proposed heading, Problem, Solution, Constraints, and Ignore-If lines.

### Error while executing tests
Problem: A test runner reports an assertion failure and exits with a non-zero status.
Solution: Identify the related test case files and root cause; if affected by files created or modified in the current task, attempt an immediate trivial fix, otherwise classify the failure before proceeding.
Constraints: Do not continue fixing after 3 failed attempts; do not fix failures that are preexisting and unrelated to the active task.
Ignore-If: The problem is known and the user confirmed it can be ignored; this is an intentional red TDD case; a later task explicitly addresses it.

### Missing root TypeScript config during package setup
Problem: A read or validation step expects root `tsconfig.json` or `tsconfig.build.json`, but this repository uses `tsconfig.base.json` plus package-level TypeScript configs instead.
Solution: Treat the missing root files as an invocation/discovery issue; read `tsconfig.base.json` and the relevant package-level `tsconfig.json`/`tsconfig.build.json`, then continue using package conventions.
Constraints: Only apply when package-level configs exist and the task is package setup or package validation; do not create root config files unless explicitly required by the track.
Ignore-If: The task explicitly requires root TypeScript config files; package-level configs are also missing; the missing file is not a TypeScript config discovery issue.

### AVA binary mismatch in newly added workspace package
Problem: A new workspace package test script using `ava` exits with “Test files must be run with the AVA CLI” because the root `.bin/ava` symlink points at another workspace AVA copy while imports resolve the root AVA package.
Solution: In the new package only, invoke the root AVA CLI file directly with `node ../../node_modules/ava/cli.js` so the CLI and imported `ava` package match.
Constraints: Only apply to newly added packages that lack a local `.bin/ava` and reproduce this exact CLI/import mismatch; keep existing package scripts unchanged.
Ignore-If: The package has a working local AVA binary; the failure is an assertion failure or intentional red TDD case; a broader dependency install strategy is being changed intentionally.

### Gitignored node_modules search misses installed packages
Problem: File search or glob tools report no files under `node_modules` even though installed packages exist, because ignored paths may be skipped by search tooling.
Solution: Verify installed package contents with direct known-path reads such as `node_modules/<scope>/<package>/package.json` and package `dist/` directories, or use package manager resolution checks before concluding files are missing.
Constraints: Only apply when package metadata or install output indicates the package is installed or resolvable; do not assume missing source files are present without direct path verification.
Ignore-If: The install or package resolution actually failed; direct reads of known package paths fail; the task requires searching non-ignored source files rather than installed dependencies.

### Memory-constrained Node validation
Problem: Broad Node/npm validation or subagent-triggered tests can exceed available heap and cause OOM in this repository.
Solution: Run Node/npm validation with `NODE_OPTIONS="--max-old-space-size=1536"`; instruct review agents not to run commands unless they use this guard, and prefer focused package tests/builds over broad suites.
Constraints: Apply to validation/test/build commands in this repo; do not use it to hide real test failures; still inspect non-OOM failures normally.
Ignore-If: The command is non-Node/non-npm; the failure is an assertion/type/build error rather than heap pressure; the user explicitly requests an unguarded run.
