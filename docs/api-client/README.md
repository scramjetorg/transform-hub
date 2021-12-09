@scramjet/api-client

# @scramjet/api-client

## Table of contents

### Classes

- [ClientError](classes/ClientError.md)
- [ClientUtils](classes/ClientUtils.md)
- [HostClient](classes/HostClient.md)
- [InstanceClient](classes/InstanceClient.md)
- [SequenceClient](classes/SequenceClient.md)

### Interfaces

- [ClientProvider](interfaces/ClientProvider.md)
- [HttpClient](interfaces/HttpClient.md)

### Type aliases

- [ClientErrorCode](README.md#clienterrorcode)
- [InstanceInputStream](README.md#instanceinputstream)
- [InstanceOutputStream](README.md#instanceoutputstream)
- [RequestLogger](README.md#requestlogger)
- [Response](README.md#response)
- [ResponseStream](README.md#responsestream)

## Type aliases

### ClientErrorCode

Ƭ **ClientErrorCode**: ``"GENERAL_ERROR"`` \| ``"BAD_PARAMETERS"`` \| ``"NEED_AUTHENTICATION"`` \| ``"NOT_AUTHORIZED"`` \| ``"NOT_FOUND"`` \| ``"GONE"`` \| ``"SERVER_ERROR"`` \| ``"REQUEST_ERROR"`` \| ``"UNKNOWN_ERROR"`` \| ``"CANNOT_CONNECT"`` \| ``"INVALID_RESPONSE"``

#### Defined in

[packages/api-client/src/client-error.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-error.ts#L3)

___

### InstanceInputStream

Ƭ **InstanceInputStream**: ``"stdin"`` \| ``"input"``

#### Defined in

[packages/api-client/src/instance-client.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L7)

___

### InstanceOutputStream

Ƭ **InstanceOutputStream**: ``"stdout"`` \| ``"stderr"`` \| ``"output"`` \| ``"log"``

#### Defined in

[packages/api-client/src/instance-client.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L8)

___

### RequestLogger

Ƭ **RequestLogger**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `error` | (`res`: [`ClientError`](classes/ClientError.md)) => `void` |
| `ok` | (`res`: `Response`) => `void` |
| `request` | (...`req`: [url: RequestInfo, init?: RequestInit]) => `void` |

#### Defined in

[packages/api-client/src/types/index.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L25)

___

### Response

Ƭ **Response**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `data?` | `Object` |
| `status` | `number` |

#### Defined in

[packages/api-client/src/types/index.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L5)

___

### ResponseStream

Ƭ **ResponseStream**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `data?` | `NodeJS.ReadableStream` |
| `status` | `number` |

#### Defined in

[packages/api-client/src/types/index.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L10)
