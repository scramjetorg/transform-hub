[@scramjet/host](../README.md) / [Exports](../modules.md) / ServiceDiscovery

# Class: ServiceDiscovery

Service Discovery provides methods to manage topics.
Its functionality covers creating, storing, removing topics
and requesting Manager when instance requires data but data is not available locally.

## Table of contents

### Methods

- [addData](ServiceDiscovery.md#adddata)
- [getByTopic](ServiceDiscovery.md#getbytopic)
- [getData](ServiceDiscovery.md#getdata)
- [getTopics](ServiceDiscovery.md#gettopics)
- [removeData](ServiceDiscovery.md#removedata)
- [removeLocalProvider](ServiceDiscovery.md#removelocalprovider)
- [setConnector](ServiceDiscovery.md#setconnector)

### Constructors

- [constructor](ServiceDiscovery.md#constructor)

### Properties

- [cpmConnector](ServiceDiscovery.md#cpmconnector)
- [dataMap](ServiceDiscovery.md#datamap)
- [logger](ServiceDiscovery.md#logger)

## Methods

### addData

▸ **addData**(`config`, `localProvider?`): [`topicDataType`](../modules.md#topicdatatype)

Stores given topic.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`dataType`](../modules.md#datatype) | Topic configuration. |
| `localProvider?` | `string` | - |

#### Returns

[`topicDataType`](../modules.md#topicdatatype)

added topic data.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L64)

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

[packages/host/src/lib/sd-adapter.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L110)

___

### getData

▸ **getData**(`dataType`): `undefined` \| `ReadableStream`<`any`\> \| `WritableStream`<`any`\>

Returns topic details for given topic.
If topic does not exist it will be created.
If topic exists but is not local, data will be requested from Manager.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dataType` | [`dataType`](../modules.md#datatype) | Topic configuration. |

#### Returns

`undefined` \| `ReadableStream`<`any`\> \| `WritableStream`<`any`\>

Topic stream.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L139)

___

### getTopics

▸ **getTopics**(): `any`

**`todo:`** implement.

#### Returns

`any`

All topics.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L98)

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

[packages/host/src/lib/sd-adapter.ts:180](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L180)

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

[packages/host/src/lib/sd-adapter.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L123)

___

### setConnector

▸ **setConnector**(`cpmConnector`): `void`

Sets the CPM connector.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmConnector` | [`CPMConnector`](CPMConnector.md) | Manager connector instance used to communicate with Manager. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L53)

## Constructors

### constructor

• **new ServiceDiscovery**()

## Properties

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

#### Defined in

[packages/host/src/lib/sd-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L46)

___

### dataMap

• **dataMap**: `Map`<`string`, [`topicDataType`](../modules.md#topicdatatype)\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L39)

___

### logger

• **logger**: `ObjLogger`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L44)
