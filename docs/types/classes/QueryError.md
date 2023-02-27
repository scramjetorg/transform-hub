[@scramjet/types](../README.md) / [Exports](../modules.md) / QueryError

# Class: QueryError

## Hierarchy

- `Error`

  ↳ **`QueryError`**

## Table of contents

### Properties

- [body](QueryError.md#body)
- [code](QueryError.md#code)
- [message](QueryError.md#message)
- [name](QueryError.md#name)
- [prepareStackTrace](QueryError.md#preparestacktrace)
- [response](QueryError.md#response)
- [stack](QueryError.md#stack)
- [stackTraceLimit](QueryError.md#stacktracelimit)
- [status](QueryError.md#status)
- [url](QueryError.md#url)

### Methods

- [captureStackTrace](QueryError.md#capturestacktrace)

### Constructors

- [constructor](QueryError.md#constructor)

## Properties

### body

• `Optional` `Readonly` **body**: `any`

#### Defined in

[packages/types/src/api-client/client-utils.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L10)

___

### code

• `Optional` `Readonly` **code**: `string`

#### Defined in

[packages/types/src/api-client/client-utils.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L9)

___

### message

• **message**: `string`

#### Inherited from

Error.message

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1029

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

### response

• `Optional` `Readonly` **response**: `Response`

#### Defined in

[packages/types/src/api-client/client-utils.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L11)

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

• `Optional` `Readonly` **status**: `string`

#### Defined in

[packages/types/src/api-client/client-utils.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L8)

___

### url

• `Readonly` **url**: `string`

#### Defined in

[packages/types/src/api-client/client-utils.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L7)

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

## Constructors

### constructor

• **new QueryError**(`url`, `code`, `status?`, `body?`, `response?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `code` | `string` |
| `status?` | `string` |
| `body?` | `string` |
| `response?` | `Response` |

#### Overrides

Error.constructor

#### Defined in

[packages/types/src/api-client/client-utils.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L12)
