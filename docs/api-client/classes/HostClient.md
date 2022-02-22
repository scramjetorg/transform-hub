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

[host-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L12)

___

### client

• **client**: `ClientUtils`

#### Implementation of

[ClientProvider](../interfaces/ClientProvider.md).[client](../interfaces/ClientProvider.md#client)

#### Defined in

[host-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L13)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[host-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L15)

## Methods

### deleteSequence

▸ **deleteSequence**(`sequenceId`): `Promise`<`DeleteSequenceResponse`\>

Deletes sequence with given id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id |

#### Returns

`Promise`<`DeleteSequenceResponse`\>

Promise resolving to delete Sequence result.

#### Defined in

[host-client.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L78)

___

### getInstanceInfo

▸ **getInstanceInfo**(`instanceId`): `Promise`<`Instance`\>

Returns instance details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceId` | `string` | Instance id. |

#### Returns

`Promise`<`Instance`\>

Promise resolving to Instance details.

#### Defined in

[host-client.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L89)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

Returns Host load-check.

#### Returns

`Promise`<`LoadCheckStat`\>

Promise resolving to Host load check data.

#### Defined in

[host-client.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L98)

___

### getLogStream

▸ **getLogStream**(): `Promise`<`Stream` \| `ReadableStream`<`any`\>\>

Returns Host log stream.

#### Returns

`Promise`<`Stream` \| `ReadableStream`<`any`\>\>

Promise resolving to response with log stream.

#### Defined in

[host-client.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L44)

___

### getNamedData

▸ **getNamedData**(`topic`): `Promise`<`Stream`\>

Returns stream from given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |

#### Returns

`Promise`<`Stream`\>

Promise resolving to stream.

#### Defined in

[host-client.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L131)

___

### getSequence

▸ **getSequence**(`sequenceId`): `Promise`<`GetSequenceResponse`\>

Returns sequence details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Seqeuence id. |

#### Returns

`Promise`<`GetSequenceResponse`\>

Promise resolving to Sequence details.

#### Defined in

[host-client.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L68)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Returns Host version.

#### Returns

`Promise`<`GetVersionResponse`\>

Promise resolving to Host version.

#### Defined in

[host-client.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L107)

___

### listInstances

▸ **listInstances**(): `Promise`<`GetInstancesResponse`\>

Returns list of all instances on Host.

#### Returns

`Promise`<`GetInstancesResponse`\>

Promise resolving to list of Instances.

#### Defined in

[host-client.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L35)

___

### listSequences

▸ **listSequences**(): `Promise`<`GetSequencesResponse`\>

Returns list of all sequences on Host.

#### Returns

`Promise`<`GetSequencesResponse`\>

Promise resolving to list of Sequences.

#### Defined in

[host-client.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L26)

___

### sendNamedData

▸ **sendNamedData**<`T`\>(`topic`, `stream`, `contentType?`, `end?`): `Promise`<`T`\>

Sends data to the topic.
Topics are a part of Service Discovery feature enabling data exchange through Topics API.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |
| `stream` | `Readable` | Stream to be piped to topic. |
| `contentType?` | `string` | - |
| `end?` | `boolean` | Indicates if "end" event from stream should be passed to topic. |

#### Returns

`Promise`<`T`\>

TODO: comment.

#### Defined in

[host-client.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L121)

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

[host-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L54)
