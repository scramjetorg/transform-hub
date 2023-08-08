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

### deleteStoreItem

▸ **deleteStoreItem**(`id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[manager-client.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L92)

___

### disconnectHubs

▸ **disconnectHubs**(`opts`): `Promise`<`PostDisconnectResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `any` |

#### Returns

`Promise`<`PostDisconnectResponse`\>

#### Defined in

[manager-client.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L96)

___

### getAllSequences

▸ **getAllSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[manager-client.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L63)

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

[manager-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L55)

___

### getConfig

▸ **getConfig**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

#### Defined in

[manager-client.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L59)

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

[manager-client.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L25)

___

### getInstances

▸ **getInstances**(): `Promise`<`GetInstancesResponse`\>

#### Returns

`Promise`<`GetInstancesResponse`\>

#### Defined in

[manager-client.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L71)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStat`\>

#### Returns

`Promise`<`LoadCheckStat`\>

#### Defined in

[manager-client.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L33)

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

[manager-client.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L51)

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

[manager-client.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L47)

___

### getSequences

▸ **getSequences**(): `Promise`<`GetSequencesResponse`\>

#### Returns

`Promise`<`GetSequencesResponse`\>

#### Defined in

[manager-client.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L67)

___

### getStoreItems

▸ **getStoreItems**(): `Promise`<`GetStoreItemsResponse`\>

#### Returns

`Promise`<`GetStoreItemsResponse`\>

#### Defined in

[manager-client.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L79)

___

### getTopics

▸ **getTopics**(): `Promise`<`GetTopicsResponse`\>

#### Returns

`Promise`<`GetTopicsResponse`\>

#### Defined in

[manager-client.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L75)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

#### Returns

`Promise`<`GetVersionResponse`\>

#### Defined in

[manager-client.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L29)

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

[manager-client.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L83)

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

[manager-client.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/manager-api-client/src/manager-client.ts#L37)
