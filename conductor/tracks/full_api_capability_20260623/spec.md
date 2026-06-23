# Specification: Full API Capability via Verser2 Forwarding

## Overview

Implement full API forwarding capability across Hub/STH, Manager, MultiManager, and Transform Sequence routes by resolving allowed Verser2 `308` route decisions into tunnels while preserving `308` as the semi-deny behavior for disallowed upward external API requests.

This track addresses the current gap where Manager and MultiManager follow routes can stop at redirect metadata instead of completing allowed downward API paths, and where standard HTTP clients can fail instance RPC forwarding because hop-by-hop headers are forwarded into Verser2 routed metadata.

The implementation must be driven by BDD first. The first implementation phase must add reproducing BDD coverage, followed by the implementation phase that makes those scenarios pass.

## Track Type

Feature / bug fix for API forwarding correctness.

## Functional Requirements

1. External API calls to local sequence RPC through a Hub/STH must tunnel successfully to the sequence instead of failing on forbidden hop-by-hop headers.
2. MultiManager to Manager to Host/STH to sequence downward requests must tunnel successfully for allowed sequence API paths.
3. Manager to Host/STH to sequence downward requests must tunnel successfully for allowed sequence API paths.
4. Sequence/runtime-originated calls that reach Manager through Hub/STH may resolve Manager `308` route decisions in the Host and tunnel upward when policy authorizes that origin.
5. External API-originated calls that attempt to tunnel upward through Hub/STH to Manager must not silently tunnel. They must return `308` route metadata to the client.
6. API v2 instance RPC paths must be implemented as working request forwarding paths, including `/api/v2/instances/:instanceId/rpc/*`.
7. API v2 RPC implementation does not need to provide complete static sequence-specific typings. If a client knows the sequence route shape, it may call it; closing the typing gap is out of scope.
8. Standard client hop-by-hop headers must be stripped before HTTP headers become Verser2 routed metadata.
9. The `Connection` header must also be parsed so any additional header names nominated by it are stripped.
10. Redirect parsing and resolution logic must be kept in a separate reusable file so future authorization rules can be added without burying policy in route handlers.
11. Authorization/policy logic must distinguish at least local/downward requests, upward Manager requests, and unknown or disallowed routes.
12. Client-supplied internal routing/auth headers must not be trusted to bypass upward-tunnel restrictions.
13. The Conductor workflow must use a dedicated branch and PR review surface. Phase 0 must create the branch, create track artifacts, commit the initial Conductor artifact commit, push it, and create the PR after that initial commit.

## BDD Requirements

1. Add a new focused BDD feature file for full API Verser2 forwarding.
2. Use/copy the existing `api-server` sequence fixture into the Manager/MultiManager fixture area for the isolated Manager aggregation stack.
3. Cover direct API to local sequence through STH v1.
4. Cover direct API to local sequence through STH v2.
5. Cover Manager to Host/STH to sequence downward forwarding.
6. Cover MultiManager to Manager to Host/STH to sequence downward forwarding.
7. Cover sequence/runtime-originated Manager access through Hub/STH where authorized 308 resolution tunnels to Manager.
8. Cover external API-originated upward access through Hub/STH returning `308` instead of tunneling.
9. Include a standard HTTP client request shape that sends `Connection` and other hop-by-hop headers to reproduce the original failure.

## Non-Functional Requirements

1. Preserve reliable sequence execution and existing v1 API compatibility.
2. Keep routing and forwarding changes narrow and observable through tests.
3. Avoid broad Manager/MultiManager trust model changes beyond the minimal policy surface needed for this track.
4. Avoid full sequence-specific RPC typing work for v2.
5. Avoid full Docker/Kubernetes BDD unless required by an unexpected process-adapter limitation.
6. Use npm commands and repository memory-guard guidance for validation.
7. Keep PR descriptions as real multiline Markdown, using a file-based body when creating or updating the PR.

## Acceptance Criteria

1. New BDD scenarios initially reproduce the direct and routed forwarding gaps before implementation.
2. Direct STH v1 API to sequence RPC succeeds with standard hop-by-hop client headers present at ingress.
3. Direct STH v2 API to sequence RPC succeeds for `/api/v2/instances/:instanceId/rpc/*`.
4. Manager downward forwarding reaches the target sequence and returns the sequence response.
5. MultiManager downward forwarding reaches Manager, then Host/STH, then the target sequence and returns the sequence response.
6. Sequence/runtime-originated Manager access through Hub/STH follows allowed `308` route decisions and tunnels to Manager.
7. External API-originated upward Manager access through Hub/STH returns `308` route metadata and does not tunnel.
8. Hop-by-hop headers, including `Connection`-nominated headers, are not present in Verser2 routed metadata.
9. Focused package tests cover header sanitization, redirect parsing/policy behavior, and v2 RPC forwarding where package-level coverage is practical.
10. Focused BDD validation for the new feature passes.
11. A dedicated track branch exists, an initial Conductor artifact commit is pushed, and a GitHub PR is created after that initial commit.

## Out of Scope

1. Full static typings for arbitrary sequence-specific v2 RPC routes.
2. Broad Manager/MultiManager mTLS or trust model redesign.
3. Full API client SDK generation for sequence-specific RPC methods.
4. Docker and Kubernetes adapter-specific validation unless process-adapter BDD cannot cover the behavior.
5. Replacing the entire Manager route classification model.
6. Changing unrelated v1 API semantics outside the forwarding paths required by this track.
