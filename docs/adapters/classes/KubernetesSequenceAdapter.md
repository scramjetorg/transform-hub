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

[kubernetes-sequence-adapter.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L60)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ISequenceAdapter.logger

#### Defined in

[kubernetes-sequence-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L56)

___

### name

• **name**: `string` = `"KubernetesSequenceAdapter"`

#### Implementation of

ISequenceAdapter.name

#### Defined in

[kubernetes-sequence-adapter.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L58)

## Constructors

### constructor

• **new KubernetesSequenceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-sequence-adapter.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L62)

## Methods

### identify

▸ **identify**(`stream`, `id`, `override?`): `Promise`<`SequenceConfig`\>

Unpacks and identifies sequence.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `stream` | `Readable` | `undefined` | Stream with packed sequence. |
| `id` | `string` | `undefined` | Sequence Id. |
| `override` | `boolean` | `false` | Removes previous sequence |

#### Returns

`Promise`<`SequenceConfig`\>

Promise resolving to identified sequence configuration.

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[kubernetes-sequence-adapter.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L116)

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

[kubernetes-sequence-adapter.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L78)

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

[kubernetes-sequence-adapter.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L94)

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

[kubernetes-sequence-adapter.ts:146](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L146)
