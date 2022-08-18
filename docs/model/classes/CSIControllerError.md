[@scramjet/model](../README.md) / [Exports](../modules.md) / CSIControllerError

# Class: CSIControllerError

## Hierarchy

- [`AppError`](AppError.md)

  ↳ **`CSIControllerError`**

## Implements

- [`ICSIControllerErrorData`](../modules.md#icsicontrollererrordata)

## Table of contents

### Methods

- [captureStackTrace](CSIControllerError.md#capturestacktrace)

### Properties

- [code](CSIControllerError.md#code)
- [data](CSIControllerError.md#data)
- [message](CSIControllerError.md#message)
- [name](CSIControllerError.md#name)
- [prepareStackTrace](CSIControllerError.md#preparestacktrace)
- [stack](CSIControllerError.md#stack)
- [stackTraceLimit](CSIControllerError.md#stacktracelimit)

### Constructors

- [constructor](CSIControllerError.md#constructor)

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

node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

• **name**: `string`

#### Inherited from

[AppError](AppError.md).[name](AppError.md#name)

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

[AppError](AppError.md).[prepareStackTrace](AppError.md#preparestacktrace)

#### Defined in

node_modules/@types/node/globals.d.ts:11

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

[AppError](AppError.md).[stack](AppError.md#stack)

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1030

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

[AppError](AppError.md).[stackTraceLimit](AppError.md#stacktracelimit)

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

[AppError](AppError.md).[constructor](AppError.md#constructor)

#### Defined in

[packages/model/src/errors/csi-controller-error.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/csi-controller-error.ts#L7)
