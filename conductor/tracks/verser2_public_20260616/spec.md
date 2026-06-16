# Specification: Clean verser2 GitHub token override from public surface

## Overview

Verser2 is expected to become public soon, although it may remain accessible through GitHub Packages for now. Transform Hub currently contains guidance and scripts related to GitHub Packages token overrides for verser2. This track should clean public-facing documentation and surfaced guidance so users are not instructed to configure a GitHub token override specifically for verser2.

The existing GitHub Packages helper/recovery function should remain available internally for future private package needs, but verser2-specific token override guidance should be removed from the public surface.

## Track Type

Chore / documentation cleanup.

## Functional Requirements

1. Audit public-facing surfaces for verser2 GitHub Packages token override guidance, including docs, README files, package metadata, generated docs sources, CLI-visible text, examples, scripts with public messaging, and related Conductor references that could be copied into public docs.
2. Remove or rewrite public-facing verser2-specific instructions that tell users to provide GitHub tokens or token override configuration.
3. Preserve internal helper/recovery functionality for GitHub Packages authentication so it can be reused later for other private packages.
4. Keep private/internal notes clear enough for maintainers and agents to recover authenticated GitHub Packages installs while verser2 still resolves from GitHub Packages.
5. Avoid changing package install behavior unless strictly required to remove public-facing verser2-specific token messaging.
6. Ensure the cleanup does not alter Hub, Manager, runner, adapter, or verser2 runtime behavior.

## Non-Functional Requirements

- Keep changes small, reviewable, and documentation-focused.
- Prefer generic wording for retained internal GitHub Packages helpers rather than verser2-specific public instructions.
- Preserve npm-based workflow and existing package validation conventions.
- Avoid exposing secrets, tokens, or private package credentials in docs or examples.

## Acceptance Criteria

- Public documentation and user-facing text no longer instruct users to configure GitHub Packages tokens specifically for verser2.
- Any retained GitHub Packages helper or known-solution note is framed as internal/generic infrastructure, not public verser2 setup guidance.
- Existing verser2 dependency resolution and install paths continue to work for the current repository state.
- No verser2 version upgrade, registry migration, runtime behavior change, or helper deletion is introduced.
- Validation includes at minimum a stale-reference scan for public token guidance plus the narrowest relevant build/lint or docs checks.

## Out of Scope

- Publishing verser2 to npmjs or changing registry locations.
- Upgrading verser2 beyond the current active target.
- Changing runtime behavior, routing behavior, or Manager/STH/runner communication.
- Removing the reusable GitHub Packages helper.
- Removing private maintainer recovery notes entirely.
