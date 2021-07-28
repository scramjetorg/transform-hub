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
- [getSequence](HostClient.md#getsequence)
- [getVersion](HostClient.md#getversion)
- [listInstances](HostClient.md#listinstances)
- [listSequences](HostClient.md#listsequences)
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

[packages/api-client/src/host-client.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L10)

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/api-client/src/host-client.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L7)

___

### client

• **client**: [`ClientUtils`](ClientUtils.md)

#### Implementation of

[ClientProvider](../interfaces/ClientProvider.md).[client](../interfaces/ClientProvider.md#client)

#### Defined in

[packages/api-client/src/host-client.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L8)

## Methods

### deleteSequence

▸ **deleteSequence**(`sequenceId`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/api-client/src/host-client.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L39)

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

[packages/api-client/src/host-client.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L49)

___

### getLoadCheck

▸ **getLoadCheck**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:53](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L53)

___

### getLogStream

▸ **getLogStream**(): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Defined in

[packages/api-client/src/host-client.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L25)

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

[packages/api-client/src/host-client.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L35)

___

### getVersion

▸ **getVersion**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:57](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L57)

___

### listInstances

▸ **listInstances**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L20)

___

### listSequences

▸ **listSequences**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/host-client.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L16)

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

[packages/api-client/src/host-client.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/host-client.ts#L29)
