[@scramjet/model](../README.md) / [Exports](../modules.md) / AppError

# Class: AppError

## Hierarchy

* *Error*

  ↳ **AppError**

## Implements

* *IAppError*

## Table of contents

### Constructors

- [constructor](apperror.md#constructor)

### Properties

- [code](apperror.md#code)
- [message](apperror.md#message)
- [name](apperror.md#name)
- [stack](apperror.md#stack)
- [prepareStackTrace](apperror.md#preparestacktrace)
- [stackTraceLimit](apperror.md#stacktracelimit)

### Methods

- [captureStackTrace](apperror.md#capturestacktrace)

## Constructors

### constructor

\+ **new AppError**(`code`: AppErrorCode): [*AppError*](apperror.md)

#### Parameters:

Name | Type |
:------ | :------ |
`code` | AppErrorCode |

**Returns:** [*AppError*](apperror.md)

Overrides: Error.constructor

Defined in: [model/src/app-error.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/app-error.ts#L6)

## Properties

### code

• **code**: AppErrorCode

Implementation of: IAppError.code

Defined in: [model/src/app-error.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/app-error.ts#L6)

___

### message

• **message**: *string*

Implementation of: IAppError.message

Inherited from: Error.message

Defined in: model/node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Implementation of: IAppError.name

Inherited from: Error.name

Defined in: model/node_modules/typescript/lib/lib.es5.d.ts:973

___

### stack

• `Optional` **stack**: *string*

Implementation of: IAppError.stack

Inherited from: Error.stack

Defined in: model/node_modules/typescript/lib/lib.es5.d.ts:975

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: Error, `stackTraces`: CallSite[]) => *any*

Optional override for formatting stack traces

**`see`** https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Type declaration:

▸ (`err`: Error, `stackTraces`: CallSite[]): *any*

#### Parameters:

Name | Type |
:------ | :------ |
`err` | Error |
`stackTraces` | CallSite[] |

**Returns:** *any*

Defined in: model/node_modules/@types/node/globals.d.ts:11

Inherited from: Error.prepareStackTrace

Defined in: model/node_modules/@types/node/globals.d.ts:11

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: *number*

Inherited from: Error.stackTraceLimit

Defined in: model/node_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace

▸ `Static`**captureStackTrace**(`targetObject`: *object*, `constructorOpt?`: Function): *void*

Create .stack property on a target object

#### Parameters:

Name | Type |
:------ | :------ |
`targetObject` | *object* |
`constructorOpt?` | Function |

**Returns:** *void*

Inherited from: Error.captureStackTrace

Defined in: model/node_modules/@types/node/globals.d.ts:4
