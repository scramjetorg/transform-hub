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

• **config**: `LoadCheckConfig`

Congiguration object with requirements to determine if machine is overloaded.

#### Defined in

[load-check.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L19)

___

### constants

• **constants**: `LoadCheckContstants`

Values calculated from configuration indicating minimum requirements.

#### Defined in

[load-check.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L26)

___

### logger

• **logger**: `Console`

Logger instance.

#### Implementation of

IComponent.logger

#### Defined in

[load-check.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L33)

## Constructors

### constructor

• **new LoadCheck**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `LoadCheckConfig` |

#### Defined in

[load-check.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L35)

## Methods

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

Gathers various resources usage and returns it as a {@link LoadCheckStat} object.

#### Returns

`Promise`<`LoadCheckStat`\>

Promise resolving to gathered load check data.

#### Defined in

[load-check.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L52)

___

### getLoadCheckStream

▸ **getLoadCheckStream**(): `StringStream`

Creates and returns a stream of load check data.
Load check data is emitted every second.

#### Returns

`StringStream`

Stream with load check data.

#### Defined in

[load-check.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L95)

___

### overloaded

▸ **overloaded**(): `Promise`<`boolean`\>

Compares current load check data with the requirements to determine if machine is overloaded.

#### Returns

`Promise`<`boolean`\>

True if machine is overloaded, false otherwise.

#### Defined in

[load-check.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L73)
