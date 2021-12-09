[@scramjet/api-client](../README.md) / HostClient

# Class: HostClient

## Implements

- [`ClientProvider`](../interfaces/ClientProvider.md)

## Table of contents

### Constructors

- [constructor](HostClient.md#constructor)

### Properties

- [apiBase](HostClient.md#apibase)
- [client](HostClient.md#client)

### Methods

- [deleteSequence](HostClient.md#deletesequence)
- [getInstanceInfo](HostClient.md#getinstanceinfo)
- [getLoadCheck](HostClient.md#getloadcheck)
- [getLogStream](HostClient.md#getlogstream)
- [getNamedData](HostClient.md#getnameddata)
- [getSequence](HostClient.md#getsequence)
- [getVersion](HostClient.md#getversion)
- [listInstances](HostClient.md#listinstances)
- [listSequences](HostClient.md#listsequences)
- [sendNamedData](HostClient.md#sendnameddata)
- [sendSequence](HostClient.md#sendsequence)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | [`ClientUtils`](ClientUtils.md) |

#### Defined in

[packages/api-client/src/host-client.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L10)

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/api-client/src/host-client.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L7)

___

### client

• **client**: [`ClientUtils`](ClientUtils.md)

#### Implementation of

[ClientProvider](../interfaces/ClientProvider.md).[client](../interfaces/ClientProvider.md#client)

#### Defined in

[packages/api-client/src/host-client.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L8)

## Methods

### deleteSequence

▸ **deleteSequence**(`sequenceId`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L38)

___

### getInstanceInfo

▸ **getInstanceInfo**(`instanceId`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instanceId` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L48)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L52)

___

### getLogStream

▸ **getLogStream**(): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Defined in

[packages/api-client/src/host-client.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L24)

___

### getNamedData

▸ **getNamedData**(`topic`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Defined in

[packages/api-client/src/host-client.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L64)

___

### getSequence

▸ **getSequence**(`sequenceId`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L34)

___

### getVersion

▸ **getVersion**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L56)

___

### listInstances

▸ **listInstances**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L20)

___

### listSequences

▸ **listSequences**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L16)

___

### sendNamedData

▸ **sendNamedData**(`topic`, `stream`, `contentType?`, `end?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |
| `stream` | `Readable` |
| `contentType?` | `string` |
| `end?` | `boolean` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L60)

___

### sendSequence

▸ **sendSequence**(`sequencePackage`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequencePackage` | `Readable` |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Defined in

[packages/api-client/src/host-client.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L28)
