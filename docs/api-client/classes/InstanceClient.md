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

[packages/api-client/src/instance-client.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L27)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L11)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[packages/api-client/src/instance-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L13)

___

### instanceURL

• `Private` **instanceURL**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L12)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[packages/api-client/src/instance-client.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L19)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/api-client/src/instance-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L15)

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

[packages/api-client/src/instance-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L69)

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

[packages/api-client/src/instance-client.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L80)

___

### getHealth

▸ **getHealth**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L84)

___

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L92)

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

[packages/api-client/src/instance-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L65)

___

### getStatus

▸ **getStatus**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L88)

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

[packages/api-client/src/instance-client.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L96)

___

### kill

▸ **kill**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L46)

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

[packages/api-client/src/instance-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L55)

___

### sendInput

▸ **sendInput**(`stream`, `options?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` \| `Stream` |
| `options?` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L104)

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

[packages/api-client/src/instance-client.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L108)

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

[packages/api-client/src/instance-client.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L100)

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

[packages/api-client/src/instance-client.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L37)

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

[packages/api-client/src/instance-client.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L23)
