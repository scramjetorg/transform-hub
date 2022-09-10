[@scramjet/telemetry](README.md) / Exports

# @scramjet/telemetry

## Table of contents

### Interfaces

- [ITelemetryAdapter](undefined)

### Type Aliases

- [TelemetryAdapter](undefined)
- [logLevel](undefined)

### Functions

- [getTelemetryAdapter](undefined)

## Interfaces

### ITelemetryAdapter

• **ITelemetryAdapter**: Interface ITelemetryAdapter

#### Defined in

[types.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L6)

## Type Aliases

### TelemetryAdapter

Ƭ **TelemetryAdapter**: Object

#### Defined in

[types.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L11)

___

### logLevel

Ƭ **logLevel**: "debug" \| "info" \| "warn" \| "error"

#### Defined in

[types.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L4)

## Functions

### getTelemetryAdapter

▸ **getTelemetryAdapter**(`adapter`, `config`): Promise<ITelemetryAdapter\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `adapter` | string |
| `config` | TelemetryAdaptersConfig |

#### Returns

Promise<ITelemetryAdapter\>

#### Defined in

[index.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/index.ts#L8)
