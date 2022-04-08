[@scramjet/types](../README.md) / [Exports](../modules.md) / APIError

# Interface: APIError

## Hierarchy

- `Error`

  ↳ **`APIError`**

## Table of contents

### Properties

- [cause](APIError.md#cause)
- [code](APIError.md#code)
- [httpMessage](APIError.md#httpmessage)
- [message](APIError.md#message)
- [name](APIError.md#name)
- [stack](APIError.md#stack)

## Properties

### cause

• `Optional` **cause**: `Error`

#### Defined in

[packages/types/src/api-expose.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L67)

___

### code

• **code**: `number`

Http status code to be outputted

#### Defined in

[packages/types/src/api-expose.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L59)

___

### httpMessage

• **httpMessage**: `string`

The message that will be sent in reason line

#### Defined in

[packages/types/src/api-expose.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L63)

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

### stack

• `Optional` **stack**: `string`

#### Inherited from

Error.stack

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1024
