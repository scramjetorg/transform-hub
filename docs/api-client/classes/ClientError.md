[@scramjet/client-utils](../README.md) / [Exports](../modules.md) / ClientError

# Class: ClientError

## Hierarchy

- `Error`

  ↳ **`ClientError`**

## Table of contents

### Properties

- [body](ClientError.md#body)
- [code](ClientError.md#code)
- [message](ClientError.md#message)
- [name](ClientError.md#name)
- [prepareStackTrace](ClientError.md#preparestacktrace)
- [reason](ClientError.md#reason)
- [source](ClientError.md#source)
- [stack](ClientError.md#stack)
- [stackTraceLimit](ClientError.md#stacktracelimit)
- [status](ClientError.md#status)

### Methods

- [captureStackTrace](ClientError.md#capturestacktrace)
- [from](ClientError.md#from)
- [toJSON](ClientError.md#tojson)

### Constructors

- [constructor](ClientError.md#constructor)

## Properties

### body

• **body**: `any`

#### Defined in

[packages/client-utils/src/client-error.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L53)

___

### code

• **code**: `string`

#### Defined in

[packages/client-utils/src/client-error.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L50)

___

### message

• **message**: `any`

#### Overrides

Error.message

#### Defined in

[packages/client-utils/src/client-error.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L52)

___

### name

• **name**: `string`

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

### reason

• `Optional` **reason**: `Error`

#### Defined in

[packages/client-utils/src/client-error.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L48)

___

### source

• `Optional` **source**: `Error`

#### Defined in

[packages/client-utils/src/client-error.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L49)

___

### stack

• `Optional` **stack**: `string`

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

___

### status

• `Optional` **status**: `string`

#### Defined in

[packages/client-utils/src/client-error.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L51)

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
| `error` | `Error` \| `QueryError` |
| `message?` | `string` |
| `source?` | `Error` |

#### Returns

[`ClientError`](ClientError.md)

#### Defined in

[packages/client-utils/src/client-error.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L67)

___

### toJSON

▸ **toJSON**(): `Promise`<`unknown`\>

#### Returns

`Promise`<`unknown`\>

#### Defined in

[packages/client-utils/src/client-error.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L89)

## Constructors

### constructor

• **new ClientError**(`code`, `reason?`, `message?`, `source?`, `status?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | [`ClientErrorCode`](../modules.md#clienterrorcode) |
| `reason?` | `string` \| `Error` |
| `message?` | `string` |
| `source?` | `Error` |
| `status?` | `string` |

#### Overrides

Error.constructor

#### Defined in

[packages/client-utils/src/client-error.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L55)
