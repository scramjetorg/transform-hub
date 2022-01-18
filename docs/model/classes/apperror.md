[@scramjet/model](../README.md) / [Exports](../modules.md) / AppError

# Class: AppError

## Hierarchy

- `Error`

  ↳ **`AppError`**

  ↳↳ [`HostError`](hosterror.md)

  ↳↳ [`RunnerError`](runnererror.md)

  ↳↳ [`InstanceAdapterError`](instanceadaptererror.md)

  ↳↳ [`CSIControllerError`](csicontrollererror.md)

  ↳↳ [`SequenceAdapterError`](sequenceadaptererror.md)

## Implements

- `IAppError`
- `IAppErrorData`

## Table of contents

### Methods

- [captureStackTrace](apperror.md#capturestacktrace)

### Properties

- [code](apperror.md#code)
- [data](apperror.md#data)
- [message](apperror.md#message)
- [name](apperror.md#name)
- [prepareStackTrace](apperror.md#preparestacktrace)
- [stack](apperror.md#stack)
- [stackTraceLimit](apperror.md#stacktracelimit)

### Constructors

- [constructor](apperror.md#constructor)

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

node_modules/typescript/lib/lib.es5.d.ts:1023

___

### name

• **name**: `string`

#### Implementation of

IAppError.name

#### Inherited from

Error.name

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1022

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

#### Type declaration

▸ (`err`, `stackTraces`): `any`

Optional override for formatting stack traces

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

node_modules/typescript/lib/lib.es5.d.ts:1024

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

[packages/model/src/errors/app-error.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L9)
