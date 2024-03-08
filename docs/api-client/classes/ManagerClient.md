[@scramjet/api-client](../README.md) / [Exports](../modules.md) / ManagerClient

# Class: ManagerClient

## Implements

- `ClientProvider`

## Table of contents

### Properties

- [#\_client](ManagerClient.md##_client)
- [apiBase](ManagerClient.md#apibase)

### Methods

- [clearStore](ManagerClient.md#clearstore)
- [deleteHub](ManagerClient.md#deletehub)
- [deleteStoreItem](ManagerClient.md#deletestoreitem)
- [disconnectHubs](ManagerClient.md#disconnecthubs)
- [getAllSequences](ManagerClient.md#getallsequences)
- [getAuditStream](ManagerClient.md#getauditstream)
- [getConfig](ManagerClient.md#getconfig)
- [getHostClient](ManagerClient.md#gethostclient)
- [getHosts](ManagerClient.md#gethosts)
- [getInstances](ManagerClient.md#getinstances)
- [getLoad](ManagerClient.md#getload)
- [getLogStream](ManagerClient.md#getlogstream)
- [getNamedData](ManagerClient.md#getnameddata)
- [getSequences](ManagerClient.md#getsequences)
- [getStoreItems](ManagerClient.md#getstoreitems)
- [getTopics](ManagerClient.md#gettopics)
- [getVersion](ManagerClient.md#getversion)
- [putStoreItem](ManagerClient.md#putstoreitem)
- [sendNamedData](ManagerClient.md#sendnameddata)

### Accessors

- [client](ManagerClient.md#client)

### Constructors

- [constructor](ManagerClient.md#constructor)

## Properties

### #\_client

• `Private` **#\_client**: `ClientUtils`

#### Defined in

[api-client/src/manager-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L12)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[api-client/src/manager-client.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L10)

## Methods

### clearStore

▸ **clearStore**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[api-client/src/manager-client.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L102)

___

### deleteHub

▸ **deleteHub**(`id`, `force`): `Promise`<`HubDeleteResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `force` | `boolean` |

#### Returns

`Promise`<`HubDeleteResponse`\>

#### Defined in

[api-client/src/manager-client.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L110)

___

### deleteStoreItem

▸ **deleteStoreItem**(`id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[api-client/src/manager-client.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L98)

___

### disconnectHubs

▸ **disconnectHubs**(`opts`): `Promise`<`PostDisconnectResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `PostDisconnectPayload` |

#### Returns

`Promise`<`PostDisconnectResponse`\>

#### Defined in

[api-client/src/manager-client.ts:106](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L106)

___

### getAllSequences

▸ **getAllSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[api-client/src/manager-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L69)

___

### getAuditStream

▸ **getAuditStream**(`requestInit?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`any`\>

#### Defined in

[api-client/src/manager-client.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L61)

___

### getConfig

▸ **getConfig**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

#### Defined in

[api-client/src/manager-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L65)

___

### getHostClient

▸ **getHostClient**(`id`, `hostApiBase?`): [`HostClient`](HostClient.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `id` | `string` | `undefined` |
| `hostApiBase` | `string` | `"/api/v1"` |

#### Returns

[`HostClient`](HostClient.md)

#### Defined in

[api-client/src/manager-client.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L24)

___

### getHosts

▸ **getHosts**(): `Promise`<`ConnectedSTHInfo`[]\>

#### Returns

`Promise`<`ConnectedSTHInfo`[]\>

#### Defined in

[api-client/src/manager-client.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L31)

___

### getInstances

▸ **getInstances**(): `Promise`<`GetInstancesResponse`\>

#### Returns

`Promise`<`GetInstancesResponse`\>

#### Defined in

[api-client/src/manager-client.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L77)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStat`\>

#### Returns

`Promise`<`LoadCheckStat`\>

#### Defined in

[api-client/src/manager-client.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L39)

___

### getLogStream

▸ **getLogStream**(`requestInit?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`any`\>

#### Defined in

[api-client/src/manager-client.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L57)

___

### getNamedData

▸ **getNamedData**(`topic`, `requestInit?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`any`\>

#### Defined in

[api-client/src/manager-client.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L53)

___

### getSequences

▸ **getSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[api-client/src/manager-client.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L73)

___

### getStoreItems

▸ **getStoreItems**(): `Promise`<`GetStoreItemsResponse`\>

#### Returns

`Promise`<`GetStoreItemsResponse`\>

#### Defined in

[api-client/src/manager-client.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L85)

___

### getTopics

▸ **getTopics**(): `Promise`<`GetTopicsResponse`\>

#### Returns

`Promise`<`GetTopicsResponse`\>

#### Defined in

[api-client/src/manager-client.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L81)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

#### Returns

`Promise`<`GetVersionResponse`\>

#### Defined in

[api-client/src/manager-client.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L35)

___

### putStoreItem

▸ **putStoreItem**(`sequencePackage`, `id?`): `Promise`<`SequenceConfig`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sequencePackage` | `Readable` | `undefined` |
| `id` | `string` | `""` |

#### Returns

`Promise`<`SequenceConfig`\>

#### Defined in

[api-client/src/manager-client.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L89)

___

### sendNamedData

▸ **sendNamedData**<`T`\>(`topic`, `stream`, `requestInit?`, `contentType?`, `end?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |
| `stream` | `string` \| `Readable` |
| `requestInit?` | `RequestInit` |
| `contentType?` | `string` |
| `end?` | `boolean` |

#### Returns

`Promise`<`T`\>

#### Defined in

[api-client/src/manager-client.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L43)

## Accessors

### client

• `get` **client**(): `ClientUtils`

#### Returns

`ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[api-client/src/manager-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L14)

## Constructors

### constructor

• **new ManagerClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[api-client/src/manager-client.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/manager-client.ts#L18)
