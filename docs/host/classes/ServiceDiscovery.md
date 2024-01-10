[@scramjet/host](../README.md) / [Exports](../modules.md) / ServiceDiscovery

# Class: ServiceDiscovery

Service Discovery provides methods to manage topics.
Its functionality covers creating, storing, removing topics
and requesting Manager when Instance requires data but data is not available locally.

## Table of contents

### Constructors

- [constructor](ServiceDiscovery.md#constructor)

### Properties

- [cpmConnector](ServiceDiscovery.md#cpmconnector)
- [topicsController](ServiceDiscovery.md#topicscontroller)

### Methods

- [createTopicIfNotExist](ServiceDiscovery.md#createtopicifnotexist)
- [deleteTopic](ServiceDiscovery.md#deletetopic)
- [getByTopic](ServiceDiscovery.md#getbytopic)
- [getData](ServiceDiscovery.md#getdata)
- [getTopic](ServiceDiscovery.md#gettopic)
- [getTopics](ServiceDiscovery.md#gettopics)
- [routeStreamToTopic](ServiceDiscovery.md#routestreamtotopic)
- [routeTopicToStream](ServiceDiscovery.md#routetopictostream)
- [setConnector](ServiceDiscovery.md#setconnector)
- [update](ServiceDiscovery.md#update)

## Constructors

### constructor

• **new ServiceDiscovery**(`logger`, `hostName`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | `IObjectLogger` |
| `hostName` | `string` |

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L46)

## Properties

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L44)

___

### topicsController

• `Protected` **topicsController**: `TopicsMap`

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L43)

## Methods

### createTopicIfNotExist

▸ **createTopicIfNotExist**(`config`): `Topic`

Returns topic with given configuration, if not exists creates new one.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DataType`](../modules.md#datatype) | Topic configuration. |

#### Returns

`Topic`

added topic data.

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L87)

___

### deleteTopic

▸ **deleteTopic**(`id`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `TopicId` |

#### Returns

`boolean`

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L56)

___

### getByTopic

▸ **getByTopic**(`topic`): `undefined` \| [`StreamType`](../modules.md#streamtype)

Returns topic details for given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `TopicId` | Topic name. |

#### Returns

`undefined` \| [`StreamType`](../modules.md#streamtype)

Topic details.

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L126)

___

### getData

▸ **getData**(`dataType`): `Duplex`

Returns topic details for given topic.
If topic does not exist it will be created.
If topic exists but is not local, data will be requested from Manager.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dataType` | [`DataType`](../modules.md#datatype) | Topic configuration. |

#### Returns

`Duplex`

Topic stream.

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:146](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L146)

___

### getTopic

▸ **getTopic**(`id`): `undefined` \| `Topic`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `TopicId` |

#### Returns

`undefined` \| `Topic`

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L52)

___

### getTopics

▸ **getTopics**(): { `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

#### Returns

{ `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

All topics.

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L111)

___

### routeStreamToTopic

▸ **routeStreamToTopic**(`source`, `topicData`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `Readable` |
| `topicData` | [`DataType`](../modules.md#datatype) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:168](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L168)

___

### routeTopicToStream

▸ **routeTopicToStream**(`topicData`, `target`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topicData` | [`DataType`](../modules.md#datatype) |
| `target` | `Writable` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L154)

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

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L76)

___

### update

▸ **update**(`data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `STHTopicEventData` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:180](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L180)
