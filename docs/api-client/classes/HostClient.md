[@scramjet/api-client](../README.md) / [Exports](../modules.md) / HostClient

# Class: HostClient

Host client.
Provides methods to interact with Host.

## Implements

- `ClientProvider`

## Table of contents

### Properties

- [#\_client](HostClient.md##_client)
- [apiBase](HostClient.md#apibase)

### Accessors

- [client](HostClient.md#client)

### Constructors

- [constructor](HostClient.md#constructor)

### Methods

- [createTopic](HostClient.md#createtopic)
- [deleteSequence](HostClient.md#deletesequence)
- [deleteTopic](HostClient.md#deletetopic)
- [getAuditStream](HostClient.md#getauditstream)
- [getConfig](HostClient.md#getconfig)
- [getInstanceClient](HostClient.md#getinstanceclient)
- [getInstanceInfo](HostClient.md#getinstanceinfo)
- [getLoadCheck](HostClient.md#getloadcheck)
- [getLogStream](HostClient.md#getlogstream)
- [getNamedData](HostClient.md#getnameddata)
- [getSequence](HostClient.md#getsequence)
- [getSequenceClient](HostClient.md#getsequenceclient)
- [getStatus](HostClient.md#getstatus)
- [getTopics](HostClient.md#gettopics)
- [getVersion](HostClient.md#getversion)
- [listEntities](HostClient.md#listentities)
- [listInstances](HostClient.md#listinstances)
- [listSequences](HostClient.md#listsequences)
- [sendNamedData](HostClient.md#sendnameddata)
- [sendSequence](HostClient.md#sendsequence)

## Properties

### #\_client

• `Private` **#\_client**: `ClientUtils`

#### Defined in

[api-client/src/host-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L14)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[api-client/src/host-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L12)

## Accessors

### client

• `get` **client**(): `ClientUtils`

#### Returns

`ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[api-client/src/host-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L16)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[api-client/src/host-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L20)

## Methods

### createTopic

▸ **createTopic**(`id`, `contentType`): `Promise`<{ `topicName`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `contentType` | `string` |

#### Returns

`Promise`<{ `topicName`: `string`  }\>

#### Defined in

[api-client/src/host-client.ts:195](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L195)

___

### deleteSequence

▸ **deleteSequence**(`sequenceId`, `opts?`): `Promise`<`DeleteSequenceResponse`\>

Deletes Sequence with given id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id. |
| `opts?` | `Object` | Additional sequence delete options. |
| `opts.force` | `boolean` | - |

#### Returns

`Promise`<`DeleteSequenceResponse`\>

Promise resolving to delete Sequence result.

#### Defined in

[api-client/src/host-client.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L110)

___

### deleteTopic

▸ **deleteTopic**(`id`): `Promise`<{ `message`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<{ `message`: `string`  }\>

#### Defined in

[api-client/src/host-client.ts:199](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L199)

___

### getAuditStream

▸ **getAuditStream**(`requestInit?`): `Promise`<`Readable`\>

Returns Host audit stream.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to response with log stream.

#### Defined in

[api-client/src/host-client.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L59)

___

### getConfig

▸ **getConfig**(): `Promise`<`PublicSTHConfiguration`\>

Returns Host public configuration.

#### Returns

`Promise`<`PublicSTHConfiguration`\>

Promise resolving to Host configuration (public part).

#### Defined in

[api-client/src/host-client.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L159)

___

### getInstanceClient

▸ **getInstanceClient**(`id`): [`InstanceClient`](InstanceClient.md)

Creates InstanceClient based on current HostClient and instance id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance id. |

#### Returns

[`InstanceClient`](InstanceClient.md)

InstanceClient instance.

#### Defined in

[api-client/src/host-client.ts:213](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L213)

___

### getInstanceInfo

▸ **getInstanceInfo**(`instanceId`): `Promise`<`GetInstanceResponse`\>

Returns Instance details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceId` | `string` | Instance id. |

#### Returns

`Promise`<`GetInstanceResponse`\>

Promise resolving to Instance details.

#### Defined in

[api-client/src/host-client.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L125)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

Returns Host load-check.

#### Returns

`Promise`<`LoadCheckStat`\>

Promise resolving to Host load check data.

#### Defined in

[api-client/src/host-client.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L134)

___

### getLogStream

▸ **getLogStream**(`requestInit?`): `Promise`<`Readable`\>

Returns Host log stream.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to response with log stream.

#### Defined in

[api-client/src/host-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L69)

___

### getNamedData

▸ **getNamedData**(`topic`, `requestInit?`): `Promise`<`Readable`\>

Returns stream from given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to readable stream.

#### Defined in

[api-client/src/host-client.ts:191](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L191)

___

### getSequence

▸ **getSequence**(`sequenceId`): `Promise`<`GetSequenceResponse`\>

Returns Sequence details.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id. |

#### Returns

`Promise`<`GetSequenceResponse`\>

Promise resolving to Sequence details.

#### Defined in

[api-client/src/host-client.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L99)

___

### getSequenceClient

▸ **getSequenceClient**(`id`): [`SequenceClient`](SequenceClient.md)

Creates SequenceClient based on current HostClient and instance id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Sequence id. |

#### Returns

[`SequenceClient`](SequenceClient.md)

SequenceClient instance.

#### Defined in

[api-client/src/host-client.ts:223](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L223)

___

### getStatus

▸ **getStatus**(): `Promise`<`GetStatusResponse`\>

Returns Host status.

#### Returns

`Promise`<`GetStatusResponse`\>

#### Defined in

[api-client/src/host-client.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L150)

___

### getTopics

▸ **getTopics**(): `Promise`<`GetTopicsResponse`\>

#### Returns

`Promise`<`GetTopicsResponse`\>

#### Defined in

[api-client/src/host-client.ts:203](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L203)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Returns Host version.

#### Returns

`Promise`<`GetVersionResponse`\>

Promise resolving to Host version.

#### Defined in

[api-client/src/host-client.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L143)

___

### listEntities

▸ **listEntities**(): `Promise`<`GetEntitiesResponse`\>

Returns list of all entities on Host.

#### Returns

`Promise`<`GetEntitiesResponse`\>

Promise resolving to list of entities.

#### Defined in

[api-client/src/host-client.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L49)

___

### listInstances

▸ **listInstances**(): `Promise`<`GetInstancesResponse`\>

Returns list of all Instances on Host.

#### Returns

`Promise`<`GetInstancesResponse`\>

Promise resolving to list of Instances.

#### Defined in

[api-client/src/host-client.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L40)

___

### listSequences

▸ **listSequences**(): `Promise`<`GetSequencesResponse`\>

Returns list of all Sequences on Host.

#### Returns

`Promise`<`GetSequencesResponse`\>

Promise resolving to list of Sequences.

#### Defined in

[api-client/src/host-client.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L31)

___

### sendNamedData

▸ **sendNamedData**<`T`\>(`topic`, `stream`, `requestInit?`, `contentType?`, `end?`): `Promise`<`T`\>

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
| `stream` | `string` \| `Readable` | Stream to be piped to topic. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |
| `contentType?` | `string` | Content type to be set in headers. |
| `end?` | `boolean` | Indicates if "end" event from stream should be passed to topic. |

#### Returns

`Promise`<`T`\>

TODO: comment.

#### Defined in

[api-client/src/host-client.ts:174](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L174)

___

### sendSequence

▸ **sendSequence**(`sequencePackage`, `requestInit?`, `update?`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

Uploads Sequence to Host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequencePackage` | `string` \| `Readable` | Stream with packed Sequence. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |
| `update?` | `boolean` | Send request with post or put method. |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

Sequence client.

#### Defined in

[api-client/src/host-client.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L81)
