[@scramjet/api-client](../README.md) / [Exports](../modules.md) / HostClient

# Class: HostClient

Host client.
Provides methods to interact with Host.

## Implements

- [`ClientProvider`](../interfaces/ClientProvider.md)

## Table of contents

### Properties

- [apiBase](HostClient.md#apibase)
- [client](HostClient.md#client)

### Constructors

- [constructor](HostClient.md#constructor)

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

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/api-client/src/host-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L11)

___

### client

• **client**: [`ClientUtils`](ClientUtils.md)

#### Implementation of

[ClientProvider](../interfaces/ClientProvider.md).[client](../interfaces/ClientProvider.md#client)

#### Defined in

[packages/api-client/src/host-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L12)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | [`ClientUtils`](ClientUtils.md) |

#### Defined in

[packages/api-client/src/host-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L14)

## Methods

### deleteSequence

▸ **deleteSequence**(`sequenceId`): `Promise`<[`Response`](../modules.md#response)\>

Deletes sequence with given id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/host-client.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L75)

___

### getInstanceInfo

▸ **getInstanceInfo**(`instanceId`): `Promise`<[`Response`](../modules.md#response)\>

Returns instance details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceId` | `string` | Instance id. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Instance details.

#### Defined in

[packages/api-client/src/host-client.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L91)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<[`Response`](../modules.md#response)\>

Returns Host load-check.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to Host load check data.

#### Defined in

[packages/api-client/src/host-client.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L100)

___

### getLogStream

▸ **getLogStream**(): `Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Returns Host log stream.

#### Returns

`Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Promise resolving to response with log stream.

#### Defined in

[packages/api-client/src/host-client.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L43)

___

### getNamedData

▸ **getNamedData**(`topic`): `Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Returns stream from given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |

#### Returns

`Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Promise resolving to stream.

#### Defined in

[packages/api-client/src/host-client.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L133)

___

### getSequence

▸ **getSequence**(`sequenceId`): `Promise`<[`Response`](../modules.md#response)\>

Returns sequence details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Seqeuence id. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Object with sequence details.

#### Defined in

[packages/api-client/src/host-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L65)

___

### getVersion

▸ **getVersion**(): `Promise`<[`Response`](../modules.md#response)\>

Returns Host version.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to Host version.

#### Defined in

[packages/api-client/src/host-client.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L109)

___

### listInstances

▸ **listInstances**(): `Promise`<[`Response`](../modules.md#response)\>

Returns list of all instances on Host.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to response with list.

#### Defined in

[packages/api-client/src/host-client.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L34)

___

### listSequences

▸ **listSequences**(): `Promise`<[`Response`](../modules.md#response)\>

Returns list of all sequences on Host.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to response with list.

#### Defined in

[packages/api-client/src/host-client.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L25)

___

### sendNamedData

▸ **sendNamedData**(`topic`, `stream`, `contentType?`, `end?`): `Promise`<[`Response`](../modules.md#response)\>

Sends data to the topic.
Topics are a part of Service Discovery feature enabling data exchange through Topics API.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |
| `stream` | `Readable` | Stream to be piped to topic. |
| `contentType?` | `string` | - |
| `end?` | `boolean` | Indicates if "end" event from stream should be passed to topic. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/host-client.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L123)

___

### sendSequence

▸ **sendSequence**(`sequencePackage`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

Uploads sequence to Host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequencePackage` | `Readable` | Stream with packad sequence. |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

Sequence client.

#### Defined in

[packages/api-client/src/host-client.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L53)
