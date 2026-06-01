# packages/types/

## Responsibility

Shared type surface for STH configuration, command options, adapter contracts, and cross-package DTOs.

## Design Patterns

Type-only package; uses structural types, partial/public variants, and narrow config shapes to keep runtime packages decoupled.

## Data & Control Flow

Defines the canonical `STHConfiguration`/`STHCommandOptions` shapes that CLI/config code merges into runtime config and passes to host/adapter code.

## Integration Points

Consumed by `@scramjet/sth-config`, `@scramjet/sth`, `@scramjet/host`, and CLI/adapter packages.
