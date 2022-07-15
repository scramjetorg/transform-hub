[@scramjet/adapters](../README.md) / [Exports](../modules.md) / KubernetesSequenceAdapter

# Class: KubernetesSequenceAdapter

Adapter for preparing Sequence to be run in process.

## Implements

- `ISequenceAdapter`

## Table of contents

### Properties

- [adapterConfig](KubernetesSequenceAdapter.md#adapterconfig)
- [logger](KubernetesSequenceAdapter.md#logger)
- [name](KubernetesSequenceAdapter.md#name)

### Constructors

- [constructor](KubernetesSequenceAdapter.md#constructor)

### Methods

- [identify](KubernetesSequenceAdapter.md#identify)
- [init](KubernetesSequenceAdapter.md#init)
- [list](KubernetesSequenceAdapter.md#list)
- [remove](KubernetesSequenceAdapter.md#remove)

## Properties

### adapterConfig

• `Private` **adapterConfig**: `K8SAdapterConfiguration`

#### Defined in

[kubernetes-sequence-adapter.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L53)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ISequenceAdapter.logger

#### Defined in

[kubernetes-sequence-adapter.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L49)

___

### name

• **name**: `string` = `"KubernetesSequenceAdapter"`

#### Implementation of

ISequenceAdapter.name

#### Defined in

[kubernetes-sequence-adapter.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L51)

## Constructors

### constructor

• **new KubernetesSequenceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-sequence-adapter.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L55)

## Methods

### identify

▸ **identify**(`stream`, `id`): `Promise`<`SequenceConfig`\>

Unpacks and identifies sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `Readable` | Stream with packed sequence. |
| `id` | `string` | Sequence Id. |

#### Returns

`Promise`<`SequenceConfig`\>

Promise resolving to identified sequence configuration.

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[kubernetes-sequence-adapter.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L108)

___

### init

▸ **init**(): `Promise`<`void`\>

Initializes adapter.

#### Returns

`Promise`<`void`\>

Promise resolving after initialization.

#### Implementation of

ISequenceAdapter.init

#### Defined in

[kubernetes-sequence-adapter.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L71)

___

### list

▸ **list**(): `Promise`<`SequenceConfig`[]\>

Finds existing sequences.

#### Returns

`Promise`<`SequenceConfig`[]\>

Promise resolving to array of identified sequences.

#### Implementation of

ISequenceAdapter.list

#### Defined in

[kubernetes-sequence-adapter.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L87)

___

### remove

▸ **remove**(`config`): `Promise`<`void`\>

Removes directory used to store sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `SequenceConfig` | Sequence configuration. |

#### Returns

`Promise`<`void`\>

Promise resolving after directory deletion.

#### Implementation of

ISequenceAdapter.remove

#### Defined in

[kubernetes-sequence-adapter.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L134)
