[@scramjet/manager-api-client](../README.md) / [Exports](../modules.md) / ManagerClient

# Class: ManagerClient

## Implements

- `ClientProvider`

## Table of contents

### Properties

- [apiBase](ManagerClient.md#apibase)

### Accessors

- [client](ManagerClient.md#client)

### Constructors

- [constructor](ManagerClient.md#constructor)

### Methods

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

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[manager-client.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L7)

## Accessors

### client

• `get` **client**(): `ClientUtils`

#### Returns

`ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[manager-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L11)

## Constructors

### constructor

• **new ManagerClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[manager-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L15)

## Methods

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

[manager-client.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L103)

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

[manager-client.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L95)

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

[manager-client.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L99)

___

### getAllSequences

▸ **getAllSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[manager-client.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L66)

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

[manager-client.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L58)

___

### getConfig

▸ **getConfig**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

#### Defined in

[manager-client.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L62)

___

### getHostClient

▸ **getHostClient**(`id`, `hostApiBase?`): `HostClient`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `id` | `string` | `undefined` |
| `hostApiBase` | `string` | `"/api/v1"` |

#### Returns

`HostClient`

#### Defined in

[manager-client.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L21)

___

### getHosts

▸ **getHosts**(): `Promise`<`ConnectedSTHInfo`[]\>

#### Returns

`Promise`<`ConnectedSTHInfo`[]\>

#### Defined in

[manager-client.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L28)

___

### getInstances

▸ **getInstances**(): `Promise`<`GetInstancesResponse`\>

#### Returns

`Promise`<`GetInstancesResponse`\>

#### Defined in

[manager-client.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L74)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStat`\>

#### Returns

`Promise`<`LoadCheckStat`\>

#### Defined in

[manager-client.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L36)

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

[manager-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L54)

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

[manager-client.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L50)

___

### getSequences

▸ **getSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[manager-client.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L70)

___

### getStoreItems

▸ **getStoreItems**(): `Promise`<`GetStoreItemsResponse`\>

#### Returns

`Promise`<`GetStoreItemsResponse`\>

#### Defined in

[manager-client.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L82)

___

### getTopics

▸ **getTopics**(): `Promise`<`GetTopicsResponse`\>

#### Returns

`Promise`<`GetTopicsResponse`\>

#### Defined in

[manager-client.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L78)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

#### Returns

`Promise`<`GetVersionResponse`\>

#### Defined in

[manager-client.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L32)

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

[manager-client.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L86)

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

[manager-client.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L40)
