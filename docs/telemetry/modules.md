[@scramjet/telemetry](README.md) / Exports

# @scramjet/telemetry

## Table of contents

### Interfaces

- [ITelemetryAdapter](interfaces/ITelemetryAdapter.md)

### Type Aliases

- [TelemetryAdapter](modules.md#telemetryadapter)
- [logLevel](modules.md#loglevel)

### Functions

- [getTelemetryAdapter](modules.md#gettelemetryadapter)

## Type Aliases

### TelemetryAdapter

Ƭ **TelemetryAdapter**: (`config`: `TelemetryAdaptersConfig`) => [`ITelemetryAdapter`](interfaces/ITelemetryAdapter.md)

#### Type declaration

• **new TelemetryAdapter**(`config`): [`ITelemetryAdapter`](interfaces/ITelemetryAdapter.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `TelemetryAdaptersConfig` |

##### Returns

[`ITelemetryAdapter`](interfaces/ITelemetryAdapter.md)

#### Defined in

[types.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L11)

___

### logLevel

Ƭ **logLevel**: ``"debug"`` \| ``"info"`` \| ``"warn"`` \| ``"error"``

#### Defined in

[types.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L4)

## Functions

### getTelemetryAdapter

▸ **getTelemetryAdapter**(`adapter`, `config`): `Promise`<[`ITelemetryAdapter`](interfaces/ITelemetryAdapter.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `adapter` | `string` |
| `config` | `TelemetryAdaptersConfig` |

#### Returns

`Promise`<[`ITelemetryAdapter`](interfaces/ITelemetryAdapter.md)\>

#### Defined in

[index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/index.ts#L9)
