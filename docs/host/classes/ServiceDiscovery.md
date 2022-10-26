[@scramjet/host](../README.md) / [Exports](../modules.md) / ServiceDiscovery

# Class: ServiceDiscovery

Service Discovery provides methods to manage topics.
Its functionality covers creating, storing, removing topics
and requesting Manager when Instance requires data but data is not available locally.

## Table of contents

### Methods

- [addData](ServiceDiscovery.md#adddata)
- [createTopicsRouter](ServiceDiscovery.md#createtopicsrouter)
- [getByTopic](ServiceDiscovery.md#getbytopic)
- [getData](ServiceDiscovery.md#getdata)
- [getTopics](ServiceDiscovery.md#gettopics)
- [removeData](ServiceDiscovery.md#removedata)
- [removeLocalProvider](ServiceDiscovery.md#removelocalprovider)
- [routeStreamToTopic](ServiceDiscovery.md#routestreamtotopic)
- [routeTopicToStream](ServiceDiscovery.md#routetopictostream)
- [setConnector](ServiceDiscovery.md#setconnector)
- [update](ServiceDiscovery.md#update)

### Constructors

- [constructor](ServiceDiscovery.md#constructor)

### Properties

- [cpmConnector](ServiceDiscovery.md#cpmconnector)
- [dataMap](ServiceDiscovery.md#datamap)
- [logger](ServiceDiscovery.md#logger)
- [router](ServiceDiscovery.md#router)

## Methods

### addData

▸ **addData**(`config`, `localProvider?`): [`topicDataType`](../modules.md#topicdatatype)

Stores given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`dataType`](../modules.md#datatype) | Topic configuration. |
| `localProvider?` | `string` | Provider identifier. It not set topic will be considered as external. |

#### Returns

[`topicDataType`](../modules.md#topicdatatype)

added topic data.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L139)

___

### createTopicsRouter

▸ **createTopicsRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L79)

___

### getByTopic

▸ **getByTopic**(`topic`): `undefined` \| [`streamType`](../modules.md#streamtype)

Returns topic details for given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |

#### Returns

`undefined` \| [`streamType`](../modules.md#streamtype)

Topic details.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L177)

___

### getData

▸ **getData**(`dataType`): `Duplex`

Returns topic details for given topic.
If topic does not exist it will be created.
If topic exists but is not local, data will be requested from Manager.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dataType` | [`dataType`](../modules.md#datatype) | Topic configuration. |

#### Returns

`Duplex`

Topic stream.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:206](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L206)

___

### getTopics

▸ **getTopics**(): { `contentType`: `string` = value.contentType; `localProvider`: `undefined` \| `string` = value.localProvider; `topic`: `string` = key }[]

@TODO: implement.

#### Returns

{ `contentType`: `string` = value.contentType; `localProvider`: `undefined` \| `string` = value.localProvider; `topic`: `string` = key }[]

All topics.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L163)

___

### removeData

▸ **removeData**(`topic`): `void`

Removes store topic with given id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:237](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L237)

___

### removeLocalProvider

▸ **removeLocalProvider**(`topic`): `void`

Unsets local provider for given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:190](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L190)

___

### routeStreamToTopic

▸ **routeStreamToTopic**(`source`, `topicData`, `localProvider?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `Readable` |
| `topicData` | [`dataType`](../modules.md#datatype) |
| `localProvider?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:251](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L251)

___

### routeTopicToStream

▸ **routeTopicToStream**(`topicData`, `target`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topicData` | [`dataType`](../modules.md#datatype) |
| `target` | `Writable` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:245](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L245)

___

### setConnector

▸ **setConnector**(`cpmConnector`): `void`

Sets the CPM connector.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmConnector` | [`CPMConnector`](CPMConnector.md) | Manager connector Instance used to communicate with Manager. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L128)

___

### update

▸ **update**(`data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Object` |
| `data.contentType` | `string` |
| `data.provides?` | `string` |
| `data.requires?` | `string` |
| `data.topicName` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:258](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L258)

## Constructors

### constructor

• **new ServiceDiscovery**()

#### Defined in

[packages/host/src/lib/sd-adapter.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L75)

## Properties

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

#### Defined in

[packages/host/src/lib/sd-adapter.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L71)

___

### dataMap

• **dataMap**: `Map`<`string`, [`topicDataType`](../modules.md#topicdatatype)\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L64)

___

### logger

• **logger**: `ObjLogger`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L69)

___

### router

• **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L73)
