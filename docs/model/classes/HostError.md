[@scramjet/model](../README.md) / [Exports](../modules.md) / HostError

# Class: HostError

## Hierarchy

- [`AppError`](AppError.md)

  ↳ **`HostError`**

## Implements

- [`IHostErrorData`](../modules.md#ihosterrordata)

## Table of contents

### Methods

- [captureStackTrace](HostError.md#capturestacktrace)
- [prepareStackTrace](HostError.md#preparestacktrace)

### Properties

- [code](HostError.md#code)
- [data](HostError.md#data)
- [message](HostError.md#message)
- [name](HostError.md#name)
- [stack](HostError.md#stack)
- [stackTraceLimit](HostError.md#stacktracelimit)

### Constructors

- [constructor](HostError.md#constructor)

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

[AppError](AppError.md).[captureStackTrace](AppError.md#capturestacktrace)

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

[AppError](AppError.md).[prepareStackTrace](AppError.md#preparestacktrace)

#### Defined in

node_modules/@types/node/globals.d.ts:11

## Properties

### code

• **code**: `AppErrorCode`

#### Inherited from

[AppError](AppError.md).[code](AppError.md#code)

#### Defined in

[packages/model/src/errors/app-error.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L8)

___

### data

• `Optional` **data**: `any`

#### Inherited from

[AppError](AppError.md).[data](AppError.md#data)

#### Defined in

[packages/model/src/errors/app-error.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L9)

___

### message

• **message**: `string`

#### Inherited from

[AppError](AppError.md).[message](AppError.md#message)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1023

___

### name

• **name**: `string`

#### Inherited from

[AppError](AppError.md).[name](AppError.md#name)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1022

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

[AppError](AppError.md).[stack](AppError.md#stack)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1024

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

[AppError](AppError.md).[stackTraceLimit](AppError.md#stacktracelimit)

#### Defined in

node_modules/@types/node/globals.d.ts:13

## Constructors

### constructor

• **new HostError**(`code`, `data?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `HostErrorCode` |
| `data?` | `any` |

#### Overrides

[AppError](AppError.md).[constructor](AppError.md#constructor)

#### Defined in

[packages/model/src/errors/host-error.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/host-error.ts#L7)
