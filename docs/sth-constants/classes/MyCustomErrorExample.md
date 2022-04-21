[@scramjet/constants](../README.md) / [Exports](../modules.md) / MyCustomErrorExample

# Class: MyCustomErrorExample

## Hierarchy

- `Error`

  ↳ **`MyCustomErrorExample`**

## Table of contents

### Methods

- [captureStackTrace](MyCustomErrorExample.md#capturestacktrace)
- [prepareStackTrace](MyCustomErrorExample.md#preparestacktrace)

### Constructors

- [constructor](MyCustomErrorExample.md#constructor)

### Properties

- [message](MyCustomErrorExample.md#message)
- [name](MyCustomErrorExample.md#name)
- [stack](MyCustomErrorExample.md#stack)
- [stackTraceLimit](MyCustomErrorExample.md#stacktracelimit)

## Methods

### captureStackTrace

▸ `Static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

Error.captureStackTrace

#### Defined in

node_modules/@types/node/globals.d.ts:4

___

### prepareStackTrace

▸ `Static` `Optional` **prepareStackTrace**(`err`, `stackTraces`): `any`

Optional override for formatting stack traces

**`see`** https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### Inherited from

Error.prepareStackTrace

#### Defined in

node_modules/@types/node/globals.d.ts:11

## Constructors

### constructor

• **new MyCustomErrorExample**(`message`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |

#### Overrides

Error.constructor

#### Defined in

[packages/constants/src/lib/errors.ts:2](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/constants/src/lib/errors.ts#L2)

## Properties

### message

• **message**: `string`

#### Inherited from

Error.message

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1023

___

### name

• **name**: `string`

#### Inherited from

Error.name

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1022

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

Error.stack

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1024

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

Error.stackTraceLimit

#### Defined in

node_modules/@types/node/globals.d.ts:13
