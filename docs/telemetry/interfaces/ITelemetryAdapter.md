[@scramjet/telemetry](../README.md) / [Exports](../modules.md) / ITelemetryAdapter

# Interface: ITelemetryAdapter

## Table of contents

### Properties

- [logger](ITelemetryAdapter.md#logger)

### Methods

- [push](ITelemetryAdapter.md#push)

## Properties

### logger

• **logger**: `ObjLogger`

#### Defined in

[types.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L7)

## Methods

### push

▸ **push**(`level`, `payload`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | [`logLevel`](../modules.md#loglevel) |
| `payload` | `Object` |
| `payload.labels?` | `Object` |
| `payload.message` | `string` |

#### Returns

`void`

#### Defined in

[types.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/telemetry/src/types.ts#L8)
