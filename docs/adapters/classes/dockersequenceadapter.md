[@scramjet/adapters](../README.md) / DockerSequenceAdapter

# Class: DockerSequenceAdapter

## Implements

- `ISequenceAdapter`

## Table of contents

### Constructors

- [constructor](dockersequenceadapter.md#constructor)

### Properties

- [dockerHelper](dockersequenceadapter.md#dockerhelper)
- [logger](dockersequenceadapter.md#logger)
- [resources](dockersequenceadapter.md#resources)

### Methods

- [createVolume](dockersequenceadapter.md#createvolume)
- [fetch](dockersequenceadapter.md#fetch)
- [identify](dockersequenceadapter.md#identify)
- [identifyOnly](dockersequenceadapter.md#identifyonly)
- [init](dockersequenceadapter.md#init)
- [list](dockersequenceadapter.md#list)
- [parsePackage](dockersequenceadapter.md#parsepackage)
- [remove](dockersequenceadapter.md#remove)

## Constructors

### constructor

• **new DockerSequenceAdapter**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Defined in

[docker-sequence-adapter.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L20)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[docker-sequence-adapter.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L17)

___

### logger

• `Private` **logger**: `Console`

#### Defined in

[docker-sequence-adapter.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L20)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../README.md#dockeradapterresources) = `{}`

#### Defined in

[docker-sequence-adapter.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L18)

## Methods

### createVolume

▸ `Private` **createVolume**(`id`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[docker-sequence-adapter.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L123)

___

### fetch

▸ **fetch**(`name`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[docker-sequence-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L35)

___

### identify

▸ **identify**(`stream`, `id`): `Promise`<`SequenceConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |

#### Returns

`Promise`<`SequenceConfig`\>

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[docker-sequence-adapter.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L83)

___

### identifyOnly

▸ `Private` **identifyOnly**(`volume`): `Promise`<`undefined` \| `SequenceConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `volume` | `string` |

#### Returns

`Promise`<`undefined` \| `SequenceConfig`\>

#### Defined in

[docker-sequence-adapter.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L52)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ISequenceAdapter.init

#### Defined in

[docker-sequence-adapter.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L27)

___

### list

▸ **list**(): `Promise`<`SequenceConfig`[]\>

#### Returns

`Promise`<`SequenceConfig`[]\>

#### Implementation of

ISequenceAdapter.list

#### Defined in

[docker-sequence-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L39)

___

### parsePackage

▸ `Private` **parsePackage**(`streams`, `wait`, `volumeId`): `Promise`<`DockerSequenceConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | [`DockerAdapterStreams`](../README.md#dockeradapterstreams) |
| `wait` | `Function` |
| `volumeId` | `string` |

#### Returns

`Promise`<`DockerSequenceConfig`\>

#### Defined in

[docker-sequence-adapter.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L131)

___

### remove

▸ **remove**(`config`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SequenceConfig` |

#### Returns

`Promise`<`void`\>

#### Implementation of

ISequenceAdapter.remove

#### Defined in

[docker-sequence-adapter.ts:158](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L158)
