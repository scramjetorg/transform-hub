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
Problem: A workspace package test script using bare `ava` exits with “Test files must be run with the AVA CLI” because the resolved binary and imported package can come from different workspace locations.
Solution: Invoke AVA through `scripts/run-ava.js`, which resolves `ava/cli.js` from the active package context and spawns it as a real CLI process without hard-coded relative `node_modules` paths.
Constraints: Do not call AVA through hard-coded relative `node_modules` paths; keep package-specific AVA flags such as timeouts or coverage wrappers intact.
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

### Signicode GitHub Packages auth for verser2
Problem: Direct `npm view @signicode/verser2-*` commands fail with 401 Unauthorized because the scoped GitHub Packages registry requires an ephemeral `NODE_AUTH_TOKEN` and userconfig.
Solution: Use `npm run check:verser2-packages` or invoke npm with a temporary `.npmrc` containing `@signicode:registry=https://npm.pkg.github.com` and `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`, loading `GITHUB_PACKAGES_TOKEN` from the environment or `.env`.
Constraints: Never persist or print tokens; do not modify global npm/gh auth; use the existing checker script when possible because it creates and removes a temporary 0600 userconfig.
Ignore-If: The token is absent or lacks package read access; the failure is a real missing package/version after authenticated GitHub Packages resolution; the task intentionally changes package registry wiring.
