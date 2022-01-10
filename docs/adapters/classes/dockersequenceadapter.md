[@scramjet/adapters](../README.md) / DockerSequenceAdapter

# Class: DockerSequenceAdapter

Adapter for preparing Sequence to be run in Docker container.

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

[docker-sequence-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L23)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[docker-sequence-adapter.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L20)

___

### logger

• `Private` **logger**: `Console`

#### Defined in

[docker-sequence-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L23)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../README.md#dockeradapterresources) = `{}`

#### Defined in

[docker-sequence-adapter.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L21)

## Methods

### createVolume

▸ `Private` **createVolume**(`id`): `Promise`<`string`\>

Creates volume with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Volume id. |

#### Returns

`Promise`<`string`\>

Created volume.

#### Defined in

[docker-sequence-adapter.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L161)

___

### fetch

▸ **fetch**(`name`): `Promise`<`void`\>

Pulls image from registry.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Docker image name |

#### Returns

`Promise`<`void`\>

#### Defined in

[docker-sequence-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L46)

___

### identify

▸ **identify**(`stream`, `id`): `Promise`<`SequenceConfig`\>

Unpacks and identifies sequence in Docker volume.
This is the main adapter method creating new Docker volume and starting Prerunner
with created volume mounted to unpack sequence on it.
When Prerunner finishes, it will return JSON with sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `Readable` | Stream containing sequence to be indentified. |
| `id` | `string` | Id for the new docker volume where sequence will be stored. |

#### Returns

`Promise`<`SequenceConfig`\>

Promise resolving to sequence config.

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[docker-sequence-adapter.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L115)

___

### identifyOnly

▸ `Private` **identifyOnly**(`volume`): `Promise`<`undefined` \| `SequenceConfig`\>

Identifies sequence existing on Docker volume.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volume` | `string` | Volume id. |

#### Returns

`Promise`<`undefined` \| `SequenceConfig`\>

Sequence configuration or undefined if sequence cannot be identified.

#### Defined in

[docker-sequence-adapter.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L74)

___

### init

▸ **init**(): `Promise`<`void`\>

Initializes adapter.

#### Returns

`Promise`<`void`\>

#### Implementation of

ISequenceAdapter.init

#### Defined in

[docker-sequence-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L33)

___

### list

▸ **list**(): `Promise`<`SequenceConfig`[]\>

Finds existing Docker volumes containing sequences.

#### Returns

`Promise`<`SequenceConfig`[]\>

Promise resolving to array of identified sequences.

#### Implementation of

ISequenceAdapter.list

#### Defined in

[docker-sequence-adapter.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L55)

___

### parsePackage

▸ `Private` **parsePackage**(`streams`, `wait`, `volumeId`): `Promise`<`DockerSequenceConfig`\>

Parses PreRunner output and returns sequence configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streams` | [`DockerAdapterStreams`](../README.md#dockeradapterstreams) | Docker container std streams. |
| `wait` | `Function` | TBD |
| `volumeId` | `string` | Id of the volume where sequence is stored. |

#### Returns

`Promise`<`DockerSequenceConfig`\>

Promise resolving to sequence configuration.

#### Defined in

[docker-sequence-adapter.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L177)

___

### remove

▸ **remove**(`config`): `Promise`<`void`\>

Removes Docker volume used by Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `SequenceConfig` | Sequence configuration. |

#### Returns

`Promise`<`void`\>

#### Implementation of

ISequenceAdapter.remove

#### Defined in

[docker-sequence-adapter.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L209)
