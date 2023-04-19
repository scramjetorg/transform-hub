[@scramjet/types](../README.md) / [Exports](../modules.md) / InstanceClient

# Class: InstanceClient

## Table of contents

### Constructors

- [constructor](InstanceClient.md#constructor)

### Methods

- [from](InstanceClient.md#from)
- [getEvent](InstanceClient.md#getevent)
- [getEventStream](InstanceClient.md#geteventstream)
- [getHealth](InstanceClient.md#gethealth)
- [getInfo](InstanceClient.md#getinfo)
- [getNextEvent](InstanceClient.md#getnextevent)
- [getStream](InstanceClient.md#getstream)
- [kill](InstanceClient.md#kill)
- [sendEvent](InstanceClient.md#sendevent)
- [sendInput](InstanceClient.md#sendinput)
- [sendStdin](InstanceClient.md#sendstdin)
- [sendStream](InstanceClient.md#sendstream)
- [stop](InstanceClient.md#stop)

### Accessors

- [id](InstanceClient.md#id)

## Constructors

### constructor

• **new InstanceClient**()

## Methods

### from

▸ `Static` **from**(`id`, `host`): [`InstanceClient`](InstanceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](ClientProvider.md) |

#### Returns

[`InstanceClient`](InstanceClient.md)

#### Defined in

[packages/types/src/api-client/host-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L20)

___

### getEvent

▸ **getEvent**(`eventName`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L25)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |

#### Returns

`Promise`<`Readable`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L26)

___

### getHealth

▸ **getHealth**(): `Promise`<[`GetHealthResponse`](../modules/STHRestAPI.md#gethealthresponse)\>

#### Returns

`Promise`<[`GetHealthResponse`](../modules/STHRestAPI.md#gethealthresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L27)

___

### getInfo

▸ **getInfo**(): `Promise`<[`GetInstanceResponse`](../modules/STHRestAPI.md#getinstanceresponse)\>

#### Returns

`Promise`<[`GetInstanceResponse`](../modules/STHRestAPI.md#getinstanceresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L28)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L24)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../modules.md#instanceoutputstream) |

#### Returns

`Promise`<`Readable`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L29)

___

### kill

▸ **kill**(`opts?`): `Promise`<[`Instance`](../modules.md#instance)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | [`KillMessageData`](../modules.md#killmessagedata) |

#### Returns

`Promise`<[`Instance`](../modules.md#instance)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L22)

___

### sendEvent

▸ **sendEvent**(`eventName`, `message`): `Promise`<[`ControlMessageResponse`](../modules/STHRestAPI.md#controlmessageresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` |
| `message` | `string` |

#### Returns

`Promise`<[`ControlMessageResponse`](../modules/STHRestAPI.md#controlmessageresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L23)

___

### sendInput

▸ **sendInput**(`stream`, `requestInit?`, `options?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `any` |
| `requestInit?` | `RequestInit` |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L31)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `any` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L32)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `requestInit?`, `options?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streamId` | [`InstanceInputStream`](../modules.md#instanceinputstream) |
| `stream` | `any` |
| `requestInit?` | `RequestInit` |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/types/src/api-client/host-client.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L30)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<[`Instance`](../modules.md#instance)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |
| `canCallKeepalive` | `boolean` |

#### Returns

`Promise`<[`Instance`](../modules.md#instance)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L21)

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/types/src/api-client/host-client.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L18)
