[@scramjet/model](../README.md) / [Exports](../modules.md) / CSIControllerError

# Class: CSIControllerError

## Hierarchy

- [`AppError`](apperror.md)

  ↳ **`CSIControllerError`**

## Implements

- [`ICSIControllerErrorData`](../modules.md#icsicontrollererrordata)

## Table of contents

### Methods

- [captureStackTrace](csicontrollererror.md#capturestacktrace)

### Properties

- [code](csicontrollererror.md#code)
- [data](csicontrollererror.md#data)
- [message](csicontrollererror.md#message)
- [name](csicontrollererror.md#name)
- [prepareStackTrace](csicontrollererror.md#preparestacktrace)
- [stack](csicontrollererror.md#stack)
- [stackTraceLimit](csicontrollererror.md#stacktracelimit)

### Constructors

- [constructor](csicontrollererror.md#constructor)

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

[AppError](apperror.md).[captureStackTrace](apperror.md#capturestacktrace)

#### Defined in

node_modules/@types/node/globals.d.ts:4

## Properties

### code

• **code**: `AppErrorCode`

#### Inherited from

[AppError](apperror.md).[code](apperror.md#code)

#### Defined in

[packages/model/src/errors/app-error.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L8)

___

### data

• `Optional` **data**: `any`

#### Inherited from

[AppError](apperror.md).[data](apperror.md#data)

#### Defined in

[packages/model/src/errors/app-error.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L9)

___

### message

• **message**: `string`

#### Inherited from

[AppError](apperror.md).[message](apperror.md#message)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1023

___

### name

• **name**: `string`

#### Inherited from

[AppError](apperror.md).[name](apperror.md#name)

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

[AppError](apperror.md).[prepareStackTrace](apperror.md#preparestacktrace)

#### Defined in

node_modules/@types/node/globals.d.ts:11

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

[AppError](apperror.md).[stack](apperror.md#stack)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1024

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

[AppError](apperror.md).[stackTraceLimit](apperror.md#stacktracelimit)

#### Defined in

node_modules/@types/node/globals.d.ts:13

## Constructors

### constructor

• **new CSIControllerError**(`code`, `data?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `CSIControllerErrorCode` |
| `data?` | `any` |

#### Overrides

[AppError](apperror.md).[constructor](apperror.md#constructor)

#### Defined in

[packages/model/src/errors/csi-controller-error.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/csi-controller-error.ts#L6)
