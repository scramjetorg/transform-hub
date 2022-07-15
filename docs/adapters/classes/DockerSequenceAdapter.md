[@scramjet/adapters](../README.md) / [Exports](../modules.md) / DockerSequenceAdapter

# Class: DockerSequenceAdapter

Adapter for preparing Sequence to be run in Docker container.

## Implements

- `ISequenceAdapter`

## Table of contents

### Constructors

- [constructor](DockerSequenceAdapter.md#constructor)

### Methods

- [createVolume](DockerSequenceAdapter.md#createvolume)
- [fetch](DockerSequenceAdapter.md#fetch)
- [identify](DockerSequenceAdapter.md#identify)
- [identifyOnly](DockerSequenceAdapter.md#identifyonly)
- [init](DockerSequenceAdapter.md#init)
- [list](DockerSequenceAdapter.md#list)
- [parsePackage](DockerSequenceAdapter.md#parsepackage)
- [remove](DockerSequenceAdapter.md#remove)

### Properties

- [dockerHelper](DockerSequenceAdapter.md#dockerhelper)
- [logger](DockerSequenceAdapter.md#logger)
- [name](DockerSequenceAdapter.md#name)
- [resources](DockerSequenceAdapter.md#resources)

## Constructors

### constructor

• **new DockerSequenceAdapter**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Defined in

[docker-sequence-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L39)

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

[docker-sequence-adapter.ts:204](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L204)

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

[docker-sequence-adapter.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L67)

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
| `stream` | `Readable` | Stream containing sequence to be identified. |
| `id` | `string` | Id for the new docker volume where sequence will be stored. |

#### Returns

`Promise`<`SequenceConfig`\>

Promise resolving to sequence config.

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[docker-sequence-adapter.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L136)

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

[docker-sequence-adapter.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L96)

___

### init

▸ **init**(): `Promise`<`void`\>

Initializes adapter.

#### Returns

`Promise`<`void`\>

#### Implementation of

ISequenceAdapter.init

#### Defined in

[docker-sequence-adapter.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L50)

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

[docker-sequence-adapter.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L76)

___

### parsePackage

▸ `Private` **parsePackage**(`streams`, `wait`, `volumeId`): `Promise`<`DockerSequenceConfig`\>

Parses PreRunner output and returns sequence configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streams` | [`DockerAdapterStreams`](../modules.md#dockeradapterstreams) | Docker container std streams. |
| `wait` | `Function` | TBD |
| `volumeId` | `string` | Id of the volume where sequence is stored. |

#### Returns

`Promise`<`DockerSequenceConfig`\>

Promise resolving to sequence configuration.

#### Defined in

[docker-sequence-adapter.ts:222](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L222)

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

[docker-sequence-adapter.ts:274](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L274)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/IDockerHelper.md)

#### Defined in

[docker-sequence-adapter.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L29)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

ISequenceAdapter.logger

#### Defined in

[docker-sequence-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L37)

___

### name

• **name**: `string` = `"DockerSequenceAdapter"`

#### Implementation of

ISequenceAdapter.name

#### Defined in

[docker-sequence-adapter.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L32)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../modules.md#dockeradapterresources) = `{}`

#### Defined in

[docker-sequence-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L30)
