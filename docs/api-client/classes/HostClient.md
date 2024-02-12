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
- [getNamedData](HostClient.md#getnameddata)
- [sendNamedData](HostClient.md#sendnameddata)

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
- [getManagerClient](HostClient.md#getmanagerclient)
- [getSequence](HostClient.md#getsequence)
- [getSequenceClient](HostClient.md#getsequenceclient)
- [getSequenceId](HostClient.md#getsequenceid)
- [getStatus](HostClient.md#getstatus)
- [getTopic](HostClient.md#gettopic)
- [getTopics](HostClient.md#gettopics)
- [getVersion](HostClient.md#getversion)
- [listEntities](HostClient.md#listentities)
- [listInstances](HostClient.md#listinstances)
- [listSequences](HostClient.md#listsequences)
- [sendSequence](HostClient.md#sendsequence)
- [sendTopic](HostClient.md#sendtopic)

## Properties

### #\_client

• `Private` **#\_client**: `ClientUtils`

#### Defined in

[api-client/src/host-client.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L18)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[api-client/src/host-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L16)

## Accessors

### client

• `get` **client**(): `ClientUtils`

#### Returns

`ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[api-client/src/host-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L20)

___

### getNamedData

• `get` **getNamedData**(): (`topic`: `string`, `requestInit?`: `RequestInit`, `contentType?`: `string`) => `Promise`<`Readable`\>

Alias for getTopic

**`See`**

this.getTopic

#### Returns

`fn`

▸ (`topic`, `requestInit?`, `contentType?`): `Promise`<`Readable`\>

Returns stream from given topic.

##### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `topic` | `string` | `undefined` | Topic name. |
| `requestInit?` | `RequestInit` | `undefined` | RequestInit object to be passed to fetch. |
| `contentType?` | `string` | `"application/x-ndjson"` | Content type to be set in headers. |

##### Returns

`Promise`<`Readable`\>

Promise resolving to readable stream.

#### Defined in

[api-client/src/host-client.ts:215](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L215)

___

### sendNamedData

• `get` **sendNamedData**(): <T\>(`topic`: `string`, `stream`: `string` \| `Readable`, `requestInit`: `RequestInit`, `contentType?`: `string`, `end?`: `boolean`) => `Promise`<`T`\>

Alias for sendTopic

**`See`**

this.sendTopic

#### Returns

`fn`

▸ <`T`\>(`topic`, `stream`, `requestInit?`, `contentType?`, `end?`): `Promise`<`T`\>

Sends data to the topic.
Topics are a part of Service Discovery feature enabling data exchange through Topics API.

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `topic` | `string` | `undefined` | Topic name. |
| `stream` | `string` \| `Readable` | `undefined` | Stream to be piped to topic. |
| `requestInit` | `RequestInit` | `{}` | RequestInit object to be passed to fetch. |
| `contentType?` | `string` | `"application/x-ndjson"` | Content type to be set in headers. |
| `end?` | `boolean` | `undefined` | Indicates if "end" event from stream should be passed to topic. |

##### Returns

`Promise`<`T`\>

TODO: comment.

#### Defined in

[api-client/src/host-client.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L182)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[api-client/src/host-client.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L24)

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

[api-client/src/host-client.ts:231](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L231)

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

[api-client/src/host-client.ts:124](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L124)

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

[api-client/src/host-client.ts:235](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L235)

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

[api-client/src/host-client.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L74)

___

### getConfig

▸ **getConfig**(): `Promise`<`PublicSTHConfiguration`\>

Returns Host public configuration.

#### Returns

`Promise`<`PublicSTHConfiguration`\>

Promise resolving to Host configuration (public part).

#### Defined in

[api-client/src/host-client.ts:173](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L173)

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

[api-client/src/host-client.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L249)

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

[api-client/src/host-client.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L139)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<`LoadCheckStat`\>

Returns Host load-check.

#### Returns

`Promise`<`LoadCheckStat`\>

Promise resolving to Host load check data.

#### Defined in

[api-client/src/host-client.ts:148](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L148)

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

[api-client/src/host-client.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L84)

___

### getManagerClient

▸ **getManagerClient**(`apiBase?`): [`ManagerClient`](ManagerClient.md)

Creates ManagerClient for Manager that Hub is connected to.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `apiBase` | `string` | `"/api/v1"` | Api base. |

#### Returns

[`ManagerClient`](ManagerClient.md)

ManagerClient

#### Defined in

[api-client/src/host-client.ts:270](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L270)

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

[api-client/src/host-client.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L113)

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

[api-client/src/host-client.ts:259](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L259)

___

### getSequenceId

▸ **getSequenceId**(`sequenceName`): `Promise`<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceName` | `string` |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[api-client/src/host-client.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L39)

___

### getStatus

▸ **getStatus**(): `Promise`<`GetStatusResponse`\>

Returns Host status.

#### Returns

`Promise`<`GetStatusResponse`\>

#### Defined in

[api-client/src/host-client.ts:164](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L164)

___

### getTopic

▸ **getTopic**(`topic`, `requestInit?`, `contentType?`): `Promise`<`Readable`\>

Returns stream from given topic.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `topic` | `string` | `undefined` | Topic name. |
| `requestInit?` | `RequestInit` | `undefined` | RequestInit object to be passed to fetch. |
| `contentType?` | `string` | `"application/x-ndjson"` | Content type to be set in headers. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to readable stream.

#### Defined in

[api-client/src/host-client.ts:227](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L227)

___

### getTopics

▸ **getTopics**(): `Promise`<`GetTopicsResponse`\>

#### Returns

`Promise`<`GetTopicsResponse`\>

#### Defined in

[api-client/src/host-client.ts:239](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L239)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Returns Host version.

#### Returns

`Promise`<`GetVersionResponse`\>

Promise resolving to Host version.

#### Defined in

[api-client/src/host-client.ts:157](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L157)

___

### listEntities

▸ **listEntities**(): `Promise`<`GetEntitiesResponse`\>

Returns list of all entities on Host.

#### Returns

`Promise`<`GetEntitiesResponse`\>

Promise resolving to list of entities.

#### Defined in

[api-client/src/host-client.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L64)

___

### listInstances

▸ **listInstances**(): `Promise`<`GetInstancesResponse`\>

Returns list of all Instances on Host.

#### Returns

`Promise`<`GetInstancesResponse`\>

Promise resolving to list of Instances.

#### Defined in

[api-client/src/host-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L55)

___

### listSequences

▸ **listSequences**(): `Promise`<`GetSequencesResponse`\>

Returns list of all Sequences on Host.

#### Returns

`Promise`<`GetSequencesResponse`\>

Promise resolving to list of Sequences.

#### Defined in

[api-client/src/host-client.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L35)

___

### sendSequence

▸ **sendSequence**(`sequencePackage`, `requestInit?`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

Uploads Sequence to Host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequencePackage` | `string` \| `Readable` | Stream with packed Sequence. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

Sequence client.

#### Defined in

[api-client/src/host-client.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L96)

___

### sendTopic

▸ **sendTopic**<`T`\>(`topic`, `stream`, `requestInit?`, `contentType?`, `end?`): `Promise`<`T`\>

Sends data to the topic.
Topics are a part of Service Discovery feature enabling data exchange through Topics API.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `topic` | `string` | `undefined` | Topic name. |
| `stream` | `string` \| `Readable` | `undefined` | Stream to be piped to topic. |
| `requestInit` | `RequestInit` | `{}` | RequestInit object to be passed to fetch. |
| `contentType?` | `string` | `"application/x-ndjson"` | Content type to be set in headers. |
| `end?` | `boolean` | `undefined` | Indicates if "end" event from stream should be passed to topic. |

#### Returns

`Promise`<`T`\>

TODO: comment.

#### Defined in

[api-client/src/host-client.ts:197](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/host-client.ts#L197)
