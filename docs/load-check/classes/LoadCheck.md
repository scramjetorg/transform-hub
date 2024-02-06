[@scramjet/load-check](../README.md) / [Exports](../modules.md) / LoadCheck

# Class: LoadCheck

Provides methods to monitor resources usage and determine if machine is not overloaded.

## Implements

- `IComponent`

## Table of contents

### Properties

- [config](LoadCheck.md#config)
- [constants](LoadCheck.md#constants)
- [logger](LoadCheck.md#logger)

### Constructors

- [constructor](LoadCheck.md#constructor)

### Methods

- [getLoadCheck](LoadCheck.md#getloadcheck)
- [getLoadCheckStream](LoadCheck.md#getloadcheckstream)
- [overloaded](LoadCheck.md#overloaded)

## Properties

### config

• **config**: `LoadCheckRequirements`

Configuration object with requirements to determine if machine is overloaded.

#### Defined in

[load-check/src/load-check.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L25)

___

### constants

• **constants**: `LoadCheckContstants`

Values calculated from configuration indicating minimum requirements.

#### Defined in

[load-check/src/load-check.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L32)

___

### logger

• **logger**: `ObjLogger`

Logger Instance.

#### Implementation of

IComponent.logger

#### Defined in

[load-check/src/load-check.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L39)

## Constructors

### constructor

• **new LoadCheck**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`LoadCheckConfig`](LoadCheckConfig.md) |

#### Defined in

[load-check/src/load-check.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L41)

## Methods

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

Gathers various resources usage and returns it as a LoadCheckStat object.

#### Returns

`Promise`<`LoadCheckStat`\>

Promise resolving to gathered load check data.

#### Defined in

[load-check/src/load-check.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L61)

___

### getLoadCheckStream

▸ **getLoadCheckStream**(): `StringStream`

Creates and returns a stream of load check data.
Load check data is emitted every second.

#### Returns

`StringStream`

Stream with load check data.

#### Defined in

[load-check/src/load-check.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L121)

___

### overloaded

▸ **overloaded**(): `Promise`<`boolean`\>

Compares current load check data with the requirements to determine if machine is overloaded.

#### Returns

`Promise`<`boolean`\>

True if machine is overloaded, false otherwise.

#### Defined in

[load-check/src/load-check.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L99)
