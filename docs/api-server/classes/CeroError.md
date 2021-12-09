[@scramjet/api-server](../README.md) / CeroError

# Class: CeroError

## Hierarchy

- `Error`

  ↳ **`CeroError`**

## Implements

- `APIError`

## Table of contents

### Constructors

- [constructor](CeroError.md#constructor)

### Properties

- [cause](CeroError.md#cause)
- [code](CeroError.md#code)
- [httpMessage](CeroError.md#httpmessage)
- [message](CeroError.md#message)
- [name](CeroError.md#name)
- [type](CeroError.md#type)
- [stackTraceLimit](CeroError.md#stacktracelimit)

### Accessors

- [stack](CeroError.md#stack)

### Methods

- [captureStackTrace](CeroError.md#capturestacktrace)
- [prepareStackTrace](CeroError.md#preparestacktrace)

## Constructors

### constructor

• **new CeroError**(`errCode`, `cause?`, `extraMessage?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `errCode` | ``"ERR_NOT_FOUND"`` \| ``"ERR_NOT_CURRENTLY_AVAILABLE"`` \| ``"ERR_FAILED_FETCH_DATA"`` \| ``"ERR_FAILED_TO_SERIALIZE"`` \| ``"ERR_INTERNAL_ERROR"`` \| ``"ERR_INVALID_CONTENT_TYPE"`` \| ``"ERR_CANNOT_PARSE_CONTENT"`` \| ``"ERR_UNSUPPORTED_ENCODING"`` |
| `cause?` | `Error` |
| `extraMessage?` | `string` |

#### Overrides

Error.constructor

#### Defined in

[packages/api-server/src/lib/definitions.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L44)

## Properties

### cause

• `Optional` **cause**: `Error`

#### Implementation of

APIError.cause

#### Defined in

[packages/api-server/src/lib/definitions.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L40)

___

### code

• **code**: `number`

#### Implementation of

APIError.code

#### Defined in

[packages/api-server/src/lib/definitions.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L38)

___

### httpMessage

• **httpMessage**: `string`

#### Implementation of

APIError.httpMessage

#### Defined in

[packages/api-server/src/lib/definitions.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L39)

___

### message

• **message**: `string`

#### Implementation of

APIError.message

#### Inherited from

Error.message

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1023

___

### name

• **name**: `string`

#### Implementation of

APIError.name

#### Inherited from

Error.name

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1022

___

### type

• **type**: ``"ERR_NOT_FOUND"`` \| ``"ERR_NOT_CURRENTLY_AVAILABLE"`` \| ``"ERR_FAILED_FETCH_DATA"`` \| ``"ERR_FAILED_TO_SERIALIZE"`` \| ``"ERR_INTERNAL_ERROR"`` \| ``"ERR_INVALID_CONTENT_TYPE"`` \| ``"ERR_CANNOT_PARSE_CONTENT"`` \| ``"ERR_UNSUPPORTED_ENCODING"``

#### Defined in

[packages/api-server/src/lib/definitions.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L41)

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

Error.stackTraceLimit

#### Defined in

node_modules/@types/node/globals.d.ts:13

## Accessors

### stack

• `get` **stack**(): `string`

#### Returns

`string`

#### Implementation of

APIError.stack

#### Overrides

Error.stack

#### Defined in

[packages/api-server/src/lib/definitions.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L59)

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
