[@scramjet/api-client](../README.md) / [Exports](../modules.md) / ClientError

# Class: ClientError

## Hierarchy

- `Error`

  ↳ **`ClientError`**

## Table of contents

### Methods

- [captureStackTrace](ClientError.md#capturestacktrace)
- [from](ClientError.md#from)
- [prepareStackTrace](ClientError.md#preparestacktrace)

### Properties

- [code](ClientError.md#code)
- [message](ClientError.md#message)
- [name](ClientError.md#name)
- [reason](ClientError.md#reason)
- [source](ClientError.md#source)
- [stack](ClientError.md#stack)
- [stackTraceLimit](ClientError.md#stacktracelimit)

### Constructors

- [constructor](ClientError.md#constructor)

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

### from

▸ `Static` **from**(`error`, `message?`, `source?`): [`ClientError`](ClientError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` \| `FetchError` |
| `message?` | `string` |
| `source?` | `Error` |

#### Returns

[`ClientError`](ClientError.md)

#### Defined in

[packages/api-client/src/client-error.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L31)

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

## Properties

### code

• **code**: `string`

#### Defined in

[packages/api-client/src/client-error.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L20)

___

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

### reason

• `Optional` **reason**: `FetchError`

#### Defined in

[packages/api-client/src/client-error.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L18)

___

### source

• `Optional` **source**: `Error`

#### Defined in

[packages/api-client/src/client-error.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L19)

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

## Constructors

### constructor

• **new ClientError**(`code`, `reason?`, `message?`, `source?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | [`ClientErrorCode`](../modules.md#clienterrorcode) |
| `reason?` | `string` \| `Error` |
| `message?` | `string` |
| `source?` | `Error` |

#### Overrides

Error.constructor

#### Defined in

[packages/api-client/src/client-error.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L22)
