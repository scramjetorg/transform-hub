[@scramjet/model](../README.md) / [Exports](../modules.md) / AppError

# Class: AppError

## Hierarchy

- `Error`

  ↳ **`AppError`**

  ↳↳ [`HostError`](HostError.md)

  ↳↳ [`RunnerError`](RunnerError.md)

  ↳↳ [`InstanceAdapterError`](InstanceAdapterError.md)

  ↳↳ [`CSIControllerError`](CSIControllerError.md)

  ↳↳ [`SequenceAdapterError`](SequenceAdapterError.md)

## Implements

- `AppError`
- `IAppErrorData`

## Table of contents

### Methods

- [captureStackTrace](AppError.md#capturestacktrace)

### Properties

- [code](AppError.md#code)
- [data](AppError.md#data)
- [message](AppError.md#message)
- [name](AppError.md#name)
- [prepareStackTrace](AppError.md#preparestacktrace)
- [stack](AppError.md#stack)
- [stackTraceLimit](AppError.md#stacktracelimit)

### Constructors

- [constructor](AppError.md#constructor)

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

## Properties

### code

• **code**: `AppErrorCode`

#### Implementation of

IAppError.code

#### Defined in

[packages/model/src/errors/app-error.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L8)

___

### data

• `Optional` **data**: `any`

#### Implementation of

IAppErrorData.data

#### Defined in

[packages/model/src/errors/app-error.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L9)

___

### message

• **message**: `string`

#### Implementation of

IAppError.message

#### Inherited from

Error.message

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

• **name**: `string`

#### Implementation of

IAppError.name

#### Inherited from

Error.name

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1028

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

#### Type declaration

▸ (`err`, `stackTraces`): `any`

Optional override for formatting stack traces

**`See`**

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

##### Returns

`any`

#### Inherited from

Error.prepareStackTrace

#### Defined in

node_modules/@types/node/globals.d.ts:11

___

### stack

• `Optional` **stack**: `string`

#### Implementation of

IAppError.stack

#### Inherited from

Error.stack

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1030

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

Error.stackTraceLimit

#### Defined in

node_modules/@types/node/globals.d.ts:13

## Constructors

### constructor

• **new AppError**(`code`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `AppErrorCode` |

#### Overrides

Error.constructor

#### Defined in

[packages/model/src/errors/app-error.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L11)
