# Specification: Implement Manager Aggregation Fix

## Overview

Fix `0rail/transform-hub#15`: in a MultiManager topology with an embedded Manager, hubs can start locally and expose sequences/instances through their direct APIs, but the MultiManager-proxied Manager aggregation endpoints return empty arrays. The fix must make Manager-owned aggregation state reflect registered hubs, sequences, and instances when STH hubs connect through the current Manager/MultiManager/verser2 flow.

## Problem Statement

The locally confirmed reproduction shows:

- Direct hub sequence queries succeed.
- Direct hub instance queries succeed.
- MultiManager-proxied Manager endpoints return `[]`:
  - `/api/v1/cpm/<manager-id>/api/v1/list`
  - `/api/v1/cpm/<manager-id>/api/v1/all_sequences`
  - `/api/v1/cpm/<manager-id>/api/v1/instances`

This violates the product goal of operational clarity and reliable supervision: operators should be able to observe connected hubs and their sequence/instance inventory through the Manager API when using MultiManager.

## Functional Requirements

1. Manager `/list` through the MultiManager proxy must include connected STH hubs after successful registration.
2. Manager `/all_sequences` through the MultiManager proxy must include sequence inventory sent by connected STH hubs.
3. Manager `/instances` through the MultiManager proxy must include instance inventory sent by connected STH hubs.
4. Registration handling must not miss early sequence or instance inventory emitted during or immediately after STH control-stream initialization.
5. CPM/verser2 readiness semantics must avoid treating a hub as ready for inventory exchange before the communication/control stream can accept inventory messages.
6. Bulk instance inventory handling must be protocol-compatible with currently emitted payloads and tolerate existing raw `Instance[]` payloads if needed for backward compatibility.
7. The fix must preserve existing direct hub API behavior and existing process adapter sequence startup behavior.

## Non-Functional Requirements

1. Keep changes narrow and compatible with existing Manager, MultiManager, Host, and CPM connector package responsibilities.
2. Avoid breaking public API paths or response shapes except to populate previously empty aggregation data.
3. Prefer backward-compatible receiver-side normalization when protocol payload ambiguity exists.
4. Use focused package tests before or alongside implementation.
5. Avoid requiring the Docker repro path as a completion gate unless it becomes necessary during implementation.

## Acceptance Criteria

1. Focused tests cover the corrected Manager registration and inventory capture behavior.
2. Focused tests cover CPM connector readiness or inventory-send timing if that code is changed.
3. Focused tests cover bulk instance inventory normalization if that code is changed.
4. Local BDD repro scenarios pass for:
   - `MANAGER-002 TC-001 Manager /list through MM proxy includes connected hubs`
   - `MANAGER-002 TC-002 Manager /all_sequences through MM proxy includes loaded hello sequences`
   - `MANAGER-002 TC-003 Manager /instances through MM proxy includes startup instances`
5. `npm run build:packages` passes.
6. No unrelated package behavior or generated artifacts are left in the working tree.

## Out of Scope

1. Reworking the full Manager/MultiManager architecture beyond what is needed to fix aggregation state consistency.
2. Changing public REST endpoint paths.
3. Replacing verser2 transport or changing transport certificates/trust behavior.
4. Making the Docker repro a required validation path while its current bootstrap path fails before reaching assertions.
5. Introducing new runtime wrappers, adapters, or sequence-test replacement strategy.
