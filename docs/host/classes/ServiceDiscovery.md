[@scramjet/host](../README.md) / ServiceDiscovery

# Class: ServiceDiscovery

## Table of contents

### Constructors

- [constructor](ServiceDiscovery.md#constructor)

### Properties

- [cpmConnector](ServiceDiscovery.md#cpmconnector)
- [dataMap](ServiceDiscovery.md#datamap)
- [logger](ServiceDiscovery.md#logger)

### Methods

- [addData](ServiceDiscovery.md#adddata)
- [getByTopic](ServiceDiscovery.md#getbytopic)
- [getData](ServiceDiscovery.md#getdata)
- [getTopics](ServiceDiscovery.md#gettopics)
- [removeData](ServiceDiscovery.md#removedata)
- [removeLocalProvider](ServiceDiscovery.md#removelocalprovider)
- [setConnector](ServiceDiscovery.md#setconnector)

## Constructors

### constructor

• **new ServiceDiscovery**()

## Properties

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

#### Defined in

[packages/host/src/lib/sd-adapter.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L28)

___

### dataMap

• **dataMap**: `Map`<`string`, [`topicDataType`](../README.md#topicdatatype)\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L23)

___

### logger

• **logger**: `Console`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L27)

## Methods

### addData

▸ **addData**(`config`, `localProvider?`): [`topicDataType`](../README.md#topicdatatype)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`dataType`](../README.md#datatype) |
| `localProvider?` | `string` |

#### Returns

[`topicDataType`](../README.md#topicdatatype)

#### Defined in

[packages/host/src/lib/sd-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L34)

___

### getByTopic

▸ **getByTopic**(`topic`): `undefined` \| [`streamType`](../README.md#streamtype)

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |

#### Returns

`undefined` \| [`streamType`](../README.md#streamtype)

#### Defined in

[packages/host/src/lib/sd-adapter.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L68)

___

### getData

▸ **getData**(`dataType`): `undefined` \| `ReadableStream`<`any`\> \| `WritableStream`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dataType` | [`dataType`](../README.md#datatype) |

#### Returns

`undefined` \| `ReadableStream`<`any`\> \| `WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/sd-adapter.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L84)

___

### getTopics

▸ **getTopics**(): `any`

#### Returns

`any`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L62)

___

### removeData

▸ **removeData**(`topic`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L120)

___

### removeLocalProvider

▸ **removeLocalProvider**(`topic`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L76)

___

### setConnector

▸ **setConnector**(`cpmConnector`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cpmConnector` | [`CPMConnector`](CPMConnector.md) |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/sd-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L30)
