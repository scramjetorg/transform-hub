[@scramjet/client-utils](README.md) / Exports

# @scramjet/client-utils

## Table of contents

### Classes

- [ClientError](classes/ClientError.md)
- [ClientUtils](classes/ClientUtils.md)
- [ClientUtilsCustomAgent](classes/ClientUtilsCustomAgent.md)

### Type Aliases

- [ClientErrorCode](modules.md#clienterrorcode)
- [Headers](modules.md#headers)
- [RequestLogger](modules.md#requestlogger)
- [SendStreamOptions](modules.md#sendstreamoptions)

### Interfaces

- [ClientProvider](interfaces/ClientProvider.md)
- [HttpClient](interfaces/HttpClient.md)

## Type Aliases

### ClientErrorCode

Ƭ **ClientErrorCode**: ``"GENERAL_ERROR"`` \| ``"BAD_PARAMETERS"`` \| ``"NEED_AUTHENTICATION"`` \| ``"NOT_AUTHORIZED"`` \| ``"NOT_FOUND"`` \| ``"GONE"`` \| ``"SERVER_ERROR"`` \| ``"REQUEST_ERROR"`` \| ``"UNKNOWN_ERROR"`` \| ``"CANNOT_CONNECT"`` \| ``"INVALID_RESPONSE"`` \| ``"INSUFFICIENT_RESOURCES"`` \| ``"UNPROCESSABLE_ENTITY"``

#### Defined in

[packages/client-utils/src/client-error.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-error.ts#L32)

___

### Headers

Ƭ **Headers**: `Record`<`string`, `string`\>

Request headers.

#### Defined in

[packages/client-utils/src/types/index.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L23)

___

### RequestLogger

Ƭ **RequestLogger**: `Object`

Request logger.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `end` | (...`req`: `any`) => `void` |
| `error` | (`res`: [`ClientError`](classes/ClientError.md)) => `void` |
| `ok` | (`res`: `any`) => `void` |
| `request` | (...`req`: `any`) => `void` |

#### Defined in

[packages/client-utils/src/types/index.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L28)

___

### SendStreamOptions

Ƭ **SendStreamOptions**: `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"json"`` \| ``"text"`` \| ``"stream"`` ; `type`: `string`  }\>

Options for sending sending stream.

#### Defined in

[packages/client-utils/src/types/index.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L7)
