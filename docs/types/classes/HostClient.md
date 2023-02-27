[@scramjet/types](../README.md) / [Exports](../modules.md) / HostClient

# Class: HostClient

## Table of contents

### Properties

- [apiBase](HostClient.md#apibase)
- [client](HostClient.md#client)

### Constructors

- [constructor](HostClient.md#constructor)

### Methods

- [deleteSequence](HostClient.md#deletesequence)
- [getAuditStream](HostClient.md#getauditstream)
- [getConfig](HostClient.md#getconfig)
- [getEntities](HostClient.md#getentities)
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

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/types/src/api-client/host-client.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L50)

___

### client

• **client**: [`ClientUtils`](ClientUtils.md)

#### Defined in

[packages/types/src/api-client/host-client.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L51)

## Constructors

### constructor

• **new HostClient**(`apiBase`, `utils`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `undefined` \| [`ClientUtils`](ClientUtils.md) |

#### Defined in

[packages/types/src/api-client/host-client.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L53)

## Methods

### deleteSequence

▸ **deleteSequence**(`sequenceId`): `Promise`<[`DeleteSequenceResponse`](../modules/STHRestAPI.md#deletesequenceresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`Promise`<[`DeleteSequenceResponse`](../modules/STHRestAPI.md#deletesequenceresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L62)

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

[packages/types/src/api-client/host-client.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L58)

___

### getConfig

▸ **getConfig**(): `Promise`<[`PublicSTHConfiguration`](../modules.md#publicsthconfiguration)\>

#### Returns

`Promise`<[`PublicSTHConfiguration`](../modules.md#publicsthconfiguration)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L67)

___

### getEntities

▸ **getEntities**(): `Promise`<[`GetEntitiesResponse`](../modules/STHRestAPI.md#getentitiesresponse)\>

#### Returns

`Promise`<[`GetEntitiesResponse`](../modules/STHRestAPI.md#getentitiesresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L73)

___

### getInstanceClient

▸ **getInstanceClient**(`id`): [`InstanceClient`](InstanceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

[`InstanceClient`](InstanceClient.md)

#### Defined in

[packages/types/src/api-client/host-client.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L71)

___

### getInstanceInfo

▸ **getInstanceInfo**(`instanceId`): `Promise`<[`GetInstanceResponse`](../modules/STHRestAPI.md#getinstanceresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instanceId` | `string` |

#### Returns

`Promise`<[`GetInstanceResponse`](../modules/STHRestAPI.md#getinstanceresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L63)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<[`LoadCheckStat`](../modules.md#loadcheckstat)\>

#### Returns

`Promise`<[`LoadCheckStat`](../modules.md#loadcheckstat)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L64)

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

[packages/types/src/api-client/host-client.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L59)

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

[packages/types/src/api-client/host-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L69)

___

### getSequence

▸ **getSequence**(`sequenceId`): `Promise`<[`GetSequenceResponse`](../modules/STHRestAPI.md#getsequenceresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`Promise`<[`GetSequenceResponse`](../modules/STHRestAPI.md#getsequenceresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L61)

___

### getSequenceClient

▸ **getSequenceClient**(`id`): [`SequenceClient`](SequenceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

[`SequenceClient`](SequenceClient.md)

#### Defined in

[packages/types/src/api-client/host-client.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L72)

___

### getStatus

▸ **getStatus**(): `Promise`<[`GetStatusResponse`](../modules/STHRestAPI.md#getstatusresponse)\>

#### Returns

`Promise`<[`GetStatusResponse`](../modules/STHRestAPI.md#getstatusresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L66)

___

### getTopics

▸ **getTopics**(): `Promise`<[`GetTopicsResponse`](../modules/STHRestAPI.md#gettopicsresponse)\>

#### Returns

`Promise`<[`GetTopicsResponse`](../modules/STHRestAPI.md#gettopicsresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L70)

___

### getVersion

▸ **getVersion**(): `Promise`<[`GetVersionResponse`](../modules/MRestAPI.md#getversionresponse)\>

#### Returns

`Promise`<[`GetVersionResponse`](../modules/MRestAPI.md#getversionresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L65)

___

### listEntities

▸ **listEntities**(): `Promise`<[`GetEntitiesResponse`](../modules/STHRestAPI.md#getentitiesresponse)\>

#### Returns

`Promise`<[`GetEntitiesResponse`](../modules/STHRestAPI.md#getentitiesresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L57)

___

### listInstances

▸ **listInstances**(): `Promise`<[`GetInstancesResponse`](../modules/STHRestAPI.md#getinstancesresponse)\>

#### Returns

`Promise`<[`GetInstancesResponse`](../modules/STHRestAPI.md#getinstancesresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L56)

___

### listSequences

▸ **listSequences**(): `Promise`<[`GetSequencesResponse`](../modules/STHRestAPI.md#getsequencesresponse)\>

#### Returns

`Promise`<[`GetSequencesResponse`](../modules/STHRestAPI.md#getsequencesresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L55)

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
| `stream` | `any` |
| `requestInit?` | `RequestInit` |
| `contentType?` | `string` |
| `end?` | `boolean` |

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L68)

___

### sendSequence

▸ **sendSequence**(`sequencePackage`, `requestInit?`, `update?`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequencePackage` | `any` |
| `requestInit?` | `RequestInit` |
| `update?` | `boolean` |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L60)
