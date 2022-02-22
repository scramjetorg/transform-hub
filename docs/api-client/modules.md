[@scramjet/api-client](README.md) / Exports

# @scramjet/api-client

## Table of contents

### Interfaces

- [ClientProvider](interfaces/ClientProvider.md)
- [HttpClient](interfaces/HttpClient.md)

### Classes

- [HostClient](classes/HostClient.md)
- [InstanceClient](classes/InstanceClient.md)
- [SequenceClient](classes/SequenceClient.md)

### Type aliases

- [InstanceInputStream](modules.md#instanceinputstream)
- [InstanceOutputStream](modules.md#instanceoutputstream)
- [RequestLogger](modules.md#requestlogger)

## Type aliases

### InstanceInputStream

Ƭ **InstanceInputStream**: ``"stdin"`` \| ``"input"``

#### Defined in

[instance-client.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L7)

___

### InstanceOutputStream

Ƭ **InstanceOutputStream**: ``"stdout"`` \| ``"stderr"`` \| ``"output"`` \| ``"log"``

#### Defined in

[instance-client.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L8)

___

### RequestLogger

Ƭ **RequestLogger**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `error` | (`res`: `ClientError`) => `void` |
| `ok` | (`res`: `any`) => `void` |
| `request` | (...`req`: `any`) => `void` |

#### Defined in

[types/index.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L14)
