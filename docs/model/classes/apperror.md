[@scramjet/model](../README.md) / AppError

# Class: AppError

## Hierarchy

* *Error*

  ↳ **AppError**

  ↳↳ [*HostError*](hosterror.md)

  ↳↳ [*RunnerError*](runnererror.md)

  ↳↳ [*SupervisorError*](supervisorerror.md)

## Implements

* *IAppError*
* *IAppErrorData*

## Table of contents

### Constructors

- [constructor](apperror.md#constructor)

### Properties

- [code](apperror.md#code)
- [data](apperror.md#data)
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
------ | ------ |
`code` | AppErrorCode |

**Returns:** [*AppError*](apperror.md)

Defined in: [src/errors/app-error.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/app-error.ts#L9)

## Properties

### code

• **code**: AppErrorCode

Defined in: [src/errors/app-error.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/app-error.ts#L8)

___

### data

• `Optional` **data**: *any*

Defined in: [src/errors/app-error.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/app-error.ts#L9)

___

### message

• **message**: *string*

Defined in: node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Defined in: node_modules/typescript/lib/lib.es5.d.ts:973

___

### stack

• `Optional` **stack**: *undefined* \| *string*

Defined in: node_modules/typescript/lib/lib.es5.d.ts:975

___

### prepareStackTrace

▪ `Optional` `Static` **prepareStackTrace**: *undefined* \| (`err`: Error, `stackTraces`: CallSite[]) => *any*

Optional override for formatting stack traces

**`see`** https://v8.dev/docs/stack-trace-api#customizing-stack-traces

Defined in: node_modules/@types/node/globals.d.ts:11

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: *number*

Defined in: node_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace

▸ `Static`**captureStackTrace**(`targetObject`: *object*, `constructorOpt?`: Function): *void*

Create .stack property on a target object

#### Parameters:

Name | Type |
------ | ------ |
`targetObject` | *object* |
`constructorOpt?` | Function |

**Returns:** *void*

Defined in: node_modules/@types/node/globals.d.ts:4
