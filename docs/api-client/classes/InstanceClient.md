[@scramjet/api-client](../README.md) / InstanceClient

# Class: InstanceClient

## Table of contents

### Constructors

- [constructor](InstanceClient.md#constructor)

### Properties

- [\_id](InstanceClient.md#_id)
- [host](InstanceClient.md#host)
- [instanceURL](InstanceClient.md#instanceurl)

### Accessors

- [clientUtils](InstanceClient.md#clientutils)
- [id](InstanceClient.md#id)

### Methods

- [getEvent](InstanceClient.md#getevent)
- [getEventStream](InstanceClient.md#geteventstream)
- [getHealth](InstanceClient.md#gethealth)
- [getInfo](InstanceClient.md#getinfo)
- [getNextEvent](InstanceClient.md#getnextevent)
- [getStatus](InstanceClient.md#getstatus)
- [getStream](InstanceClient.md#getstream)
- [kill](InstanceClient.md#kill)
- [sendEvent](InstanceClient.md#sendevent)
- [sendInput](InstanceClient.md#sendinput)
- [sendStdin](InstanceClient.md#sendstdin)
- [sendStream](InstanceClient.md#sendstream)
- [stop](InstanceClient.md#stop)
- [from](InstanceClient.md#from)

## Constructors

### constructor

• `Private` **new InstanceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[packages/api-client/src/instance-client.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L28)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L12)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[packages/api-client/src/instance-client.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L14)

___

### instanceURL

• `Private` **instanceURL**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L13)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[packages/api-client/src/instance-client.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L20)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/api-client/src/instance-client.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L16)

## Methods

### getEvent

▸ **getEvent**(`eventName`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L71)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

Fetches event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | event name |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

stream of events from instance

#### Defined in

[packages/api-client/src/instance-client.ts:82](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L82)

___

### getHealth

▸ **getHealth**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:86](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L86)

___

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:94](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L94)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:67](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L67)

___

### getStatus

▸ **getStatus**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:90](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L90)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../README.md#instanceoutputstream) |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Defined in

[packages/api-client/src/instance-client.ts:98](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L98)

___

### kill

▸ **kill**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L48)

___

### sendEvent

▸ **sendEvent**(`eventName`, `message`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |
| `message` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:57](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L57)

___

### sendInput

▸ **sendInput**(`stream`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` \| `Stream` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:106](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L106)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` \| `Stream` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:110](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L110)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `options?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streamId` | [`InstanceInputStream`](../README.md#instanceinputstream) |
| `stream` | `string` \| `Stream` |
| `options?` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:102](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L102)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |
| `canCallKeepalive` | `boolean` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L39)

___

### from

▸ `Static` **from**(`id`, `host`): [`InstanceClient`](InstanceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Returns

[`InstanceClient`](InstanceClient.md)

#### Defined in

[packages/api-client/src/instance-client.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-client/src/instance-client.ts#L24)
