[@scramjet/load-check](../README.md) / LoadCheck

# Class: LoadCheck

## Implements

- `IComponent`

## Table of contents

### Constructors

- [constructor](LoadCheck.md#constructor)

### Properties

- [config](LoadCheck.md#config)
- [constants](LoadCheck.md#constants)
- [logger](LoadCheck.md#logger)

### Methods

- [getLoadCheck](LoadCheck.md#getloadcheck)
- [getLoadCheckStream](LoadCheck.md#getloadcheckstream)
- [overloaded](LoadCheck.md#overloaded)

## Constructors

### constructor

• **new LoadCheck**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `LoadCheckConfig` |

#### Defined in

[load-check.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L16)

## Properties

### config

• **config**: `LoadCheckConfig`

#### Defined in

[load-check.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L11)

___

### constants

• **constants**: `LoadCheckContstants`

#### Defined in

[load-check.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L12)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[load-check.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L14)

## Methods

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

#### Returns

`Promise`<`LoadCheckStat`\>

#### Defined in

[load-check.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L27)

___

### getLoadCheckStream

▸ **getLoadCheckStream**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

#### Defined in

[load-check.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L66)

___

### overloaded

▸ **overloaded**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[load-check.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/load-check.ts#L43)
